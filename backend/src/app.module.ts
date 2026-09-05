import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { StallsModule } from './modules/stalls/stalls.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { ConceptsModule } from './modules/concepts/concepts.module';
import { ObligationsModule } from './modules/obligations/obligations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CashRegistersModule } from './modules/cash-registers/cash-registers.module';
import { SanitaryServicesModule } from './modules/sanitary-services/sanitary-services.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ExportsModule } from './modules/exports/exports.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    StallsModule,
    MerchantsModule,
    ConceptsModule,
    ObligationsModule,
    PaymentsModule,
    CashRegistersModule,
    SanitaryServicesModule,
    ReportsModule,
    ExportsModule,
    AuditModule,
    SettingsModule,
    HealthModule,
  ],
})
export class AppModule {}
