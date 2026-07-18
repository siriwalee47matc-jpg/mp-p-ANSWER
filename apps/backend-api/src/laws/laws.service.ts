import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductType } from '@kp-ads/shared';

@Injectable()
export class LawsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rules = await this.prisma.lawRule.findMany({
      orderBy: { section: 'asc' },
    });

    return rules.map((rule) => ({
      ...rule,
      officialSourceUrl: this.getOfficialSourceUrl(rule.section),
      agencyGuideUrl: this.getAgencyGuideUrl(rule.section),
    }));
  }

  decorateRules(rules: any[]) {
    return rules.map((rule) => ({
      ...rule,
      officialSourceUrl: this.getOfficialSourceUrl(rule.section),
      agencyGuideUrl: this.getAgencyGuideUrl(rule.section),
    }));
  }

  getOfficialSourcesByProduct(productType: string, productLicenseNumber?: string | null) {
    const license = productLicenseNumber?.trim();
    const base = [
      {
        label: 'ราชกิจจานุเบกษา',
        url: 'https://ratchakitcha.soc.go.th/',
        note: 'แหล่งอ้างอิงประกาศและกฎหมายอย่างเป็นทางการ',
      },
      {
        label: 'สำนักงานคณะกรรมการอาหารและยา',
        url: 'https://www.fda.moph.go.th/',
        note: 'เว็บไซต์หลักของ อย. สำหรับตรวจสอบข้อมูลผลิตภัณฑ์สุขภาพ',
      },
    ];

    if (productType === ProductType.DRUG) {
      return [
        ...base,
        {
          label: 'ระบบค้นหาข้อมูลผลิตภัณฑ์ยา',
          url: 'https://pertento.fda.moph.go.th/fda_search_drug/SEARCH_DRUG/FRM_SEARCH_DRUG.aspx',
          note: license ? `ใช้ตรวจสอบเลขทะเบียนตำรับยา ${license}` : 'ใช้ตรวจสอบทะเบียนตำรับยาและชื่อทางการค้า',
        },
      ];
    }

    if (productType === ProductType.FOOD || productType === ProductType.HERBAL) {
      return [
        ...base,
        {
          label: 'กองอาหาร อย.',
          url: 'https://food.fda.moph.go.th/',
          note: license ? `ใช้ตรวจสอบข้อมูลเลขสารบบอาหาร ${license}` : 'ใช้ตรวจสอบการอนุญาตผลิตภัณฑ์อาหารและข่าวกฎหมายอาหาร',
        },
        {
          label: 'FDATHAI LINE Product Check',
          url: 'https://food.fda.moph.go.th/press-release/foodnews-25',
          note: 'ช่องทางทางการของ อย. สำหรับตรวจสอบเลข อย. ผ่าน LINE',
        },
      ];
    }

    if (productType === ProductType.MEDICAL_DEVICE) {
      return [
        ...base,
        {
          label: 'กองควบคุมเครื่องมือแพทย์',
          url: 'https://medical.fda.moph.go.th/',
          note: 'ใช้ตรวจสอบกฎหมายและข้อมูลผลิตภัณฑ์เครื่องมือแพทย์',
        },
        {
          label: 'งานโฆษณาเครื่องมือแพทย์',
          url: 'https://medical.fda.moph.go.th/advertising/',
          note: 'หน้าอ้างอิงหลักเกณฑ์การโฆษณาเครื่องมือแพทย์',
        },
      ];
    }

    return base;
  }

  private getOfficialSourceUrl(section: string) {
    if (section.includes('มาตรา 40') || section.includes('มาตรา 41')) {
      return 'https://food.fda.moph.go.th/food-law/category/fda-announcement/';
    }
    if (section.includes('มาตรา 113')) {
      return 'https://pertento.fda.moph.go.th/fda_search_drug/SEARCH_DRUG/FRM_SEARCH_DRUG.aspx';
    }
    if (section.includes('เครื่องสำอาง')) {
      return 'https://www.fda.moph.go.th/';
    }
    return 'https://ratchakitcha.soc.go.th/';
  }

  private getAgencyGuideUrl(section: string) {
    if (section.includes('มาตรา 40') || section.includes('มาตรา 41')) {
      return 'https://food.fda.moph.go.th/';
    }
    if (section.includes('มาตรา 113')) {
      return 'https://www.fda.moph.go.th/';
    }
    if (section.includes('เครื่องสำอาง')) {
      return 'https://www.fda.moph.go.th/';
    }
    return 'https://medical.fda.moph.go.th/advertising/';
  }
}
