import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน' })
  @ApiResponse({ status: 200, description: 'ล็อกอินสำเร็จ คืนค่า Token และประวัติผู้ใช้' })
  @ApiResponse({ status: 401, description: 'ข้อมูลประจำตัวไม่ถูกต้อง' })
  async login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }
}
