import { Injectable } from '@nestjs/common';
import { resolve4, resolve6, resolveMx, resolveNs } from 'node:dns/promises';

type DomainRdapSummary = {
  source: string;
  rdapServer?: string | null;
  handle?: string | null;
  registrar?: string | null;
  registrant?: string | null;
  abuseEmail?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  rawLinks?: string[];
};

type IpRdapSummary = {
  source: string;
  handle?: string | null;
  networkName?: string | null;
  country?: string | null;
  startAddress?: string | null;
  endAddress?: string | null;
};

@Injectable()
export class OsintService {
  private dnsBootstrapCache?: any;
  private ipv4BootstrapCache?: any;

  private fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 6000) {
    return fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  }

  async inspectUrl(urlStr: string) {
    const domain = this.extractDomain(urlStr);
    const [aRecords, aaaaRecords, nsRecords, mxRecords] = await Promise.all([
      this.safeResolve(() => resolve4(domain)),
      this.safeResolve(() => resolve6(domain)),
      this.safeResolve(() => resolveNs(domain)),
      this.safeResolve(() => resolveMx(domain)),
    ]);

    const ipAddress = aRecords[0] || aaaaRecords[0] || null;
    const [domainRdap, ipRdap] = await Promise.all([
      this.lookupDomainRdap(domain),
      ipAddress && this.isIpv4(ipAddress) ? this.lookupIpRdap(ipAddress) : Promise.resolve(null),
    ]);

    return {
      domain,
      sourceType: 'REAL_OSINT',
      retrievedAt: new Date().toISOString(),
      officialSources: [
        'https://www.iana.org/assignments/rdap-dns/rdap-dns.xhtml',
        'https://lookup.icann.org/en',
      ],
      dns: {
        aRecords,
        aaaaRecords,
        nsRecords,
        mxRecords: mxRecords.map((entry: any) => `${entry.exchange} (priority ${entry.priority})`),
      },
      domainRdap,
      ipRdap,
    };
  }

  private extractDomain(urlStr: string) {
    try {
      return new URL(urlStr).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return urlStr.replace(/https?:\/\/(www\.)?/i, '').split('/')[0].toLowerCase();
    }
  }

  private async safeResolve<T>(resolver: () => Promise<T>): Promise<any[]> {
    try {
      const result = await resolver();
      return Array.isArray(result) ? result : [result];
    } catch {
      return [];
    }
  }

  private async lookupDomainRdap(domain: string): Promise<DomainRdapSummary | null> {
    try {
      const bootstrap = await this.getDnsBootstrap();
      const tld = domain.split('.').pop()?.toLowerCase();
      if (!tld) return null;
      const match = bootstrap.services.find((entry: [string[], string[]]) => entry[0].includes(tld));
      const rdapServer = match?.[1]?.[0];
      if (!rdapServer) return null;

      const response = await this.fetchWithTimeout(`${rdapServer.replace(/\/$/, '')}/domain/${encodeURIComponent(domain)}`, {
        headers: { Accept: 'application/rdap+json, application/json' },
      });
      if (!response.ok) return null;

      const data: any = await response.json();
      const registrar = this.findEntityName(data, ['registrar']);
      const registrant = this.findEntityName(data, ['registrant', 'registrant organization']);
      const abuseEmail = this.findEmail(data, ['abuse']);
      const createdAt = this.findEventDate(data, ['registration', 'creation']);
      const expiresAt = this.findEventDate(data, ['expiration', 'expiry']);
      const rawLinks = Array.isArray(data.links) ? data.links.map((item: any) => item.href).filter(Boolean) : [];

      return {
        source: 'ICANN RDAP / Registry RDAP',
        rdapServer,
        handle: data.handle ?? null,
        registrar,
        registrant,
        abuseEmail,
        createdAt,
        expiresAt,
        rawLinks,
      };
    } catch {
      return null;
    }
  }

  private async lookupIpRdap(ip: string): Promise<IpRdapSummary | null> {
    try {
      const bootstrap = await this.getIpv4Bootstrap();
      const match = bootstrap.services.find((entry: [string[], string[]]) =>
        entry[0].some((cidr) => this.ipInCidr(ip, cidr)),
      );
      const rdapServer = match?.[1]?.[0];
      if (!rdapServer) return null;

      const response = await this.fetchWithTimeout(`${rdapServer.replace(/\/$/, '')}/ip/${encodeURIComponent(ip)}`, {
        headers: { Accept: 'application/rdap+json, application/json' },
      });
      if (!response.ok) return null;

      const data: any = await response.json();
      return {
        source: 'IANA IPv4 Bootstrap / RIR RDAP',
        handle: data.handle ?? null,
        networkName: data.name ?? null,
        country: data.country ?? null,
        startAddress: data.startAddress ?? null,
        endAddress: data.endAddress ?? null,
      };
    } catch {
      return null;
    }
  }

  private async getDnsBootstrap() {
    if (!this.dnsBootstrapCache) {
      const response = await this.fetchWithTimeout('https://data.iana.org/rdap/dns.json');
      this.dnsBootstrapCache = await response.json();
    }
    return this.dnsBootstrapCache;
  }

  private async getIpv4Bootstrap() {
    if (!this.ipv4BootstrapCache) {
      const response = await this.fetchWithTimeout('https://data.iana.org/rdap/ipv4.json');
      this.ipv4BootstrapCache = await response.json();
    }
    return this.ipv4BootstrapCache;
  }

  private findEntityName(data: any, roles: string[]) {
    const entity = (data.entities || []).find((item: any) =>
      (item.roles || []).some((role: string) => roles.includes(role.toLowerCase())),
    );
    if (!entity) return null;
    return entity.vcardArray?.[1]?.find((row: any[]) => row[0] === 'fn')?.[3] ?? entity.handle ?? null;
  }

  private findEmail(data: any, roles: string[]) {
    const entity = (data.entities || []).find((item: any) =>
      (item.roles || []).some((role: string) => roles.includes(role.toLowerCase())),
    );
    if (!entity) return null;
    return entity.vcardArray?.[1]?.find((row: any[]) => row[0] === 'email')?.[3] ?? null;
  }

  private findEventDate(data: any, actions: string[]) {
    const event = (data.events || []).find((item: any) =>
      actions.some((action) => String(item.eventAction || '').toLowerCase().includes(action)),
    );
    return event?.eventDate ?? null;
  }

  private isIpv4(ip: string) {
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip);
  }

  private ipInCidr(ip: string, cidr: string) {
    const [range, bitsText] = cidr.split('/');
    const bits = Number(bitsText);
    if (!this.isIpv4(ip) || !this.isIpv4(range) || Number.isNaN(bits)) return false;

    const ipLong = this.ipToLong(ip);
    const rangeLong = this.ipToLong(range);
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;

    return (ipLong & mask) === (rangeLong & mask);
  }

  private ipToLong(ip: string) {
    return ip
      .split('.')
      .map(Number)
      .reduce((acc, octet) => ((acc << 8) + octet) >>> 0, 0);
  }
}
