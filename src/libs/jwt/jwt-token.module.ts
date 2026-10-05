import { Global, Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { JwtTokenService } from './jwt-token.service';

@Global()
@Module({
  imports: [NestJwtModule.register({})],
  providers: [JwtTokenService],
  exports: [JwtTokenService, NestJwtModule],
})
export class JwtTokenModule {}
