import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน' })
  @ApiResponse({ status: 200, description: 'ล็อกอินสำเร็จ คืนค่า Token และประวัติผู้ใช้' })
  @ApiResponse({ status: 401, description: 'ข้อมูลประจำตัวไม่ถูกต้อง' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  @ApiOperation({ summary: 'Register an officer account with inspector access' })
  @ApiResponse({ status: 201, description: 'Officer account created and signed in' })
  @ApiResponse({ status: 409, description: 'An account already uses this email address' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }
}
