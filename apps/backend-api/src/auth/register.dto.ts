import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12, { message: 'รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร' })
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว' })
  @Matches(/[A-Z]/, { message: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว' })
  @Matches(/[0-9]/, { message: 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว' })
  @Matches(/[^A-Za-z0-9\s]/, { message: 'รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว' })
  password!: string;

  @IsString()
  @MinLength(12, { message: 'การยืนยันรหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร' })
  @MaxLength(128)
  confirmPassword!: string;
}
