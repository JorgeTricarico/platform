import {
  Building2,
  Phone,
  Globe,
  Clock,
  Palette,
  Cpu,
  CheckCircle2,
  XCircle,
  Wrench,
  DollarSign,
  Calendar,
  MessageSquare,
  FileText,
  Image,
  QrCode,
  Wifi,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { TenantConfig } from '@platform/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SettingsProps {
  tenant: TenantConfig;
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 dark:bg-card dark:border-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-primary">{icon}</div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="text-sm font-medium text-right truncate max-w-[60%]">
        {value ?? <span className="text-muted-foreground italic">—</span>}
      </span>
    </div>
  );
}

// ─── Coming soon badge ────────────────────────────────────────────────────────

function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ml-2">
      Próximamente
    </span>
  );
}

// ─── Feature row ─────────────────────────────────────────────────────────────

interface FeatureRowProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

function FeatureRow({ label, description, icon, enabled }: FeatureRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className={cn('p-1.5 rounded-lg', enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {enabled ? (
        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
      ) : (
        <XCircle className="w-4.5 h-4.5 text-muted-foreground/40 flex-shrink-0" />
      )}
    </div>
  );
}

// ─── All feature rows config ──────────────────────────────────────────────────

type AnyFeatures = Record<string, boolean | undefined>;

function getFeatureRows(features: AnyFeatures) {
  const rows = [
    {
      key: 'garments',
      label: 'Órdenes / Prendas',
      description: 'Gestión de órdenes de reparación de ropa',
      icon: <Wrench className="w-4 h-4" />,
    },
    {
      key: 'appointments',
      label: 'Turnos',
      description: 'Agenda y programación de citas',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      key: 'patientRecords',
      label: 'Fichas clínicas',
      description: 'Historial clínico de pacientes',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      key: 'finances',
      label: 'Finanzas',
      description: 'Control de ingresos y gastos',
      icon: <DollarSign className="w-4 h-4" />,
    },
    {
      key: 'whatsappNotifications',
      label: 'Notificaciones WhatsApp',
      description: 'Envío de mensajes por WhatsApp Business API',
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      key: 'aiChat',
      label: 'AI Chat',
      description: 'Asistente inteligente con Claude AI',
      icon: <Cpu className="w-4 h-4" />,
    },
    {
      key: 'qrCodes',
      label: 'Códigos QR',
      description: 'Generación y escaneo de tickets QR',
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      key: 'photoGallery',
      label: 'Galería de fotos',
      description: 'Fotos por orden o paciente',
      icon: <Image className="w-4 h-4" />,
    },
    {
      key: 'offlineSync',
      label: 'Sincronización offline',
      description: 'Cola offline con IndexedDB + service worker',
      icon: <Wifi className="w-4 h-4" />,
    },
  ];
  return rows.map((item) => ({ ...item, enabled: !!features[item.key] }));
}

// ─── Service row ──────────────────────────────────────────────────────────────

interface ServiceRowProps {
  name: string;
  duration?: string;
  currency: string;
}

function ServiceRow({ name, duration, currency }: ServiceRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {duration && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {duration}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{currency}</span>
    </div>
  );
}

// ─── Color swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ hsl, label }: { hsl: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl border border-white/20 shadow-sm flex-shrink-0"
        style={{ backgroundColor: `hsl(${hsl})` }}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground font-mono">hsl({hsl})</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Settings({ tenant }: SettingsProps) {
  const featureRows = getFeatureRows(tenant.features as unknown as AnyFeatures);
  const enabledCount = featureRows.filter((f) => f.enabled).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">Ajustes</h2>
          <p className="text-sm text-muted-foreground">
            Configuración del tenant <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{tenant.slug}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Editar</span>
          <ComingSoonBadge />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tenant info */}
        <SectionCard title="Información del negocio" icon={<Building2 className="w-4.5 h-4.5" />}>
          <InfoRow label="Nombre" value={tenant.name} />
          <InfoRow label="Nombre comercial" value={tenant.brandLabel} />
          <InfoRow label="Propietario" value={tenant.ownerName} />
          <InfoRow label="Dirección" value={tenant.address} />
          <InfoRow label="Moneda" value={tenant.currency} />
          <InfoRow label="Saludo dashboard" value={tenant.greeting} />
        </SectionCard>

        {/* Contact */}
        <SectionCard title="Contacto" icon={<Phone className="w-4.5 h-4.5" />}>
          <InfoRow
            label="WhatsApp"
            value={tenant.whatsappNumber ? `+${tenant.whatsappNumber}` : undefined}
          />
          <InfoRow label="Horario días de semana" value={tenant.schedule?.weekdays} />
          <InfoRow label="Horario sábados" value={tenant.schedule?.saturdays} />
          {tenant.schedule?.sundays && (
            <InfoRow label="Horario domingos" value={tenant.schedule.sundays} />
          )}
        </SectionCard>

        {/* Services */}
        <SectionCard title="Servicios" icon={<Globe className="w-4.5 h-4.5" />}>
          {tenant.serviceTypes && tenant.serviceTypes.length > 0 ? (
            <>
              {tenant.serviceTypes.map((type) => (
                <ServiceRow
                  key={type}
                  name={type}
                  currency={tenant.currency}
                />
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin servicios configurados
            </p>
          )}
          <div className="pt-3 mt-1 border-t border-border/40">
            <p className="text-xs text-muted-foreground text-center">
              Edición de servicios <ComingSoonBadge />
            </p>
          </div>
        </SectionCard>

        {/* Theme */}
        <SectionCard title="Tema visual" icon={<Palette className="w-4.5 h-4.5" />}>
          <div className="space-y-3">
            <ColorSwatch hsl={tenant.theme.primaryHsl} label="Color primario" />
            {tenant.theme.accentHsl && (
              <ColorSwatch hsl={tenant.theme.accentHsl} label="Color de acento" />
            )}
          </div>
          {tenant.theme.cssVars && Object.keys(tenant.theme.cssVars).length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/40">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Variables CSS
              </p>
              <div className="space-y-1">
                {Object.entries(tenant.theme.cssVars).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-muted-foreground">--{key}</span>
                    <span className="font-mono">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-border/40">
            <p className="text-xs text-muted-foreground text-center">
              Personalización de tema <ComingSoonBadge />
            </p>
          </div>
        </SectionCard>

        {/* Feature flags — full width on lg */}
        <div className="md:col-span-2">
          <SectionCard
            title={`Funcionalidades habilitadas — ${enabledCount} de ${featureRows.length}`}
            icon={<Cpu className="w-4.5 h-4.5" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {featureRows.map((feat) => (
                <FeatureRow
                  key={feat.key}
                  label={feat.label}
                  description={feat.description}
                  icon={feat.icon}
                  enabled={feat.enabled}
                />
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border/40">
              <p className="text-xs text-muted-foreground text-center">
                Activar / desactivar funcionalidades <ComingSoonBadge />
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
