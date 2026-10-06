"use client"

import { useState, type CSSProperties } from "react"
import Image from "next/image"
import {
  BadgeCheck,
  Bike,
  Bus,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  LifeBuoy,
  Lock,
  ShieldCheck,
  Wrench,
  CalendarClock,
  UserRoundCheck,
  Wallet,
} from "lucide-react"
import { assetUrl } from "@/lib/assets"
import { useCart } from "@/lib/cart-context"
import { formatPrice } from "@/lib/data"
import { trackAddToCart } from "@/lib/tracking-client"
import {
  GIRO_DE_RIGO_EVENT,
  GIRO_DE_RIGO_SERVICES,
  TRAVEL_BIKE_OPTIONS,
  TRAVEL_ROUTES,
  buildTravelServiceProduct,
  buildTravelServiceVariant,
  getTravelServiceBalance,
  getTravelServiceDeposit,
  getTravelServicePrice,
  TRAVEL_POLICIES,
  type TravelBikeKey,
  type TravelRouteKey,
  type TravelService,
} from "@/lib/travel-services"

// Cifras reales de CERO.UNO Travel. Mientras esten vacias no se muestra la
// franja de numeros: nunca se publican cifras inventadas.
const TRUST_STATS: { value: string; label: string }[] = []

const GUARANTEES = [
  {
    icon: Lock,
    title: "Tu bicicleta viaja asegurada",
    body: "Nuestro equipo acomoda y asegura cada bicicleta antes de salir, y tú la ves cargar y descargar. En bus viaja sin ruedas dentro de la bodega; en van, completa y anclada en su propio soporte.",
  },
  {
    icon: ShieldCheck,
    title: "Vehículos habilitados para pasajeros",
    body: "Viajas en vehículos de transporte especial con su documentación en regla y conductores profesionales dedicados a la ruta.",
  },
  {
    icon: Wrench,
    title: "Asistencia mecánica incluida",
    body: "Vamos con herramienta y acompañamiento mecánico para ajustes y armado antes de la salida del evento.",
  },
  {
    icon: BadgeCheck,
    title: "Garantía de nuestro trabajo",
    body: "Respondemos por los defectos funcionales ocasionados durante el transporte. En van la garantía cubre además las afectaciones de pintura. Cada servicio indica su cobertura exacta antes de reservar.",
  },
]

const FAQS = [
  {
    q: "¿Tengo que desarmar la bicicleta?",
    a: "Depende del vehículo. En el bus la bicicleta viaja sin ruedas: nuestro equipo las desmonta antes de cargarla y te ayuda a montarlas de nuevo al llegar. En la van no se desmonta nada: va completa y anclada en su soporte.",
  },
  {
    q: "¿Qué pasa si mi bicicleta se raya o se daña en el viaje?",
    a: "En bus respondemos por los defectos funcionales ocasionados durante el transporte, pero no por la pintura: la bici viaja sin ruedas y en bodega compartida. En van respondemos tanto por defectos funcionales como por afectaciones de pintura, porque cada bicicleta va anclada en su propio soporte. Si te preocupa el acabado de tu bici, la van es la opción indicada.",
  },
  {
    q: "¿Dónde nos encontramos para la salida a Cali?",
    a: "El recorrido arranca en Bulevar Niza a las 9:00 p. m. y de ahí vamos recogiendo a los pasajeros sobre la Avenida Boyacá: eliges la altura que más te convenga y ahí te esperamos.",
  },
  {
    q: "¿Dónde me dejan en el regreso a Bogotá?",
    a: "Entramos por la Autopista Sur y subimos hasta Bulevar Niza; desde ahí tomamos toda la Avenida Boyacá. Cada pasajero se queda en la altura de la Boyacá que más le convenga.",
  },
  {
    q: "¿Puedo comprar solo el regreso?",
    a: "Sí. Puedes tomar solo la ida, solo el regreso, o los dos trayectos. El cupo de ida y regreso sale más económico que comprar los trayectos por separado.",
  },
  {
    q: "¿Puedo viajar sin bicicleta?",
    a: "Sí. El cupo sin bicicleta es para acompañantes y cuesta menos. Elige la opción 'Sin bicicleta' al reservar.",
  },
  {
    q: "¿Cómo confirmo mi cupo?",
    a: "Apartas tu cupo pagando en línea el abono del 50% desde esta página. Después te escribimos por WhatsApp con el punto de encuentro, la hora exacta y las recomendaciones del viaje. El 50% restante lo pagas directamente al equipo logístico el día del viaje.",
  },
  {
    q: "¿Qué pasa si al final no puedo viajar?",
    a: "Si cancelas con 48 horas o más de anticipación no se cobran cargos adicionales. Si cancelas con menos de 48 horas pierdes el abono, pero no se cobra ningún sobrecosto. También puedes ceder tu cupo a otra persona: es gratis con más de 48 horas de anticipación y cuesta $15.000 por pasajero si el cambio de nombre se hace con menos de 48 horas.",
  },
]

// Los bloques entran escalonados al desplegar el panel: el retraso viaja como
// variable CSS para no multiplicar clases de animacion.
function revealStyle(delayMs: number): CSSProperties {
  return { "--travel-delay": `${delayMs}ms` } as CSSProperties
}

function ServiceCard({ service, delay }: { service: TravelService; delay: number }) {
  const { addItem } = useCart()
  const [route, setRoute] = useState<TravelRouteKey>("ida-vuelta")
  const [bike, setBike] = useState<TravelBikeKey>("con-bici")
  const [justAdded, setJustAdded] = useState(false)

  const price = getTravelServicePrice(service, route, bike)
  const deposit = getTravelServiceDeposit(service, route, bike)
  const balance = getTravelServiceBalance(service, route, bike)
  const routeInfo = TRAVEL_ROUTES.find((r) => r.key === route)!

  // Lo que el cliente se ahorra frente a comprar ida y regreso por separado.
  const roundTripSaving =
    route === "ida-vuelta"
      ? service.prices.ida[bike] + service.prices.regreso[bike] - service.prices["ida-vuelta"][bike]
      : 0

  function handleAdd() {
    const product = buildTravelServiceProduct(service, route, bike)
    addItem(product, buildTravelServiceVariant(route, bike))
    trackAddToCart({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      quantity: 1,
    })
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 2500)
  }

  const Icon = service.key === "bus" ? Bus : Bike

  return (
    <div
      style={revealStyle(delay)}
      className="travel-reveal group/card flex flex-col overflow-hidden rounded-sm border border-border bg-card transition-all duration-500 hover:border-primary/60 hover:shadow-[0_18px_50px_-24px_hsl(var(--primary)/0.55)]"
    >
      <div className="w-full overflow-hidden bg-secondary">
        <Image
          src={assetUrl(service.image)}
          alt={`${service.name} — ${service.vehicle}`}
          width={1408}
          height={768}
          className="block h-auto w-full object-cover transition-transform duration-[1200ms] ease-out group-hover/card:scale-[1.04]"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-primary/10 transition-colors duration-300 group-hover/card:bg-primary/20">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h4 className="text-lg font-bold leading-tight text-foreground">{service.name}</h4>
            <p className="truncate text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {service.vehicle}
            </p>
          </div>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{service.description}</p>

        <ul className="mb-5 flex flex-col gap-2">
          {service.highlights.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mb-5 rounded-sm border-l-2 border-primary bg-primary/5 p-4 transition-colors duration-300 group-hover/card:bg-primary/10">
          <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <BadgeCheck className="h-4 w-4 text-primary" />
            Garantía en este servicio
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Cubre:</span> {service.warranty.covers}
          </p>
          {service.warranty.excludes && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">No cubre:</span> {service.warranty.excludes}
            </p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80">{service.warranty.why}</p>
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">Trayecto</p>
        <div className="mb-5 grid gap-2">
          {TRAVEL_ROUTES.map((option) => {
            const active = route === option.key
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setRoute(option.key)}
                aria-pressed={active}
                className={`flex items-center justify-between gap-3 rounded-sm border px-3 py-2.5 text-left transition-all duration-300 ${
                  active
                    ? "border-primary bg-primary/10 shadow-[inset_2px_0_0_0_hsl(var(--primary))]"
                    : "border-border hover:border-primary/50 hover:bg-secondary/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                      active ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {active && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.short}</span>
                  </span>
                </span>
                <span className="whitespace-nowrap text-sm font-bold text-foreground">
                  {formatPrice(service.prices[option.key][bike])}
                </span>
              </button>
            )
          })}
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">¿Llevas bicicleta?</p>
        <div className="mb-6 grid grid-cols-2 gap-2">
          {TRAVEL_BIKE_OPTIONS.map((option) => {
            const active = bike === option.key
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setBike(option.key)}
                aria-pressed={active}
                className={`rounded-sm border px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        <div className="mt-auto border-t border-border pt-5">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Valor total por persona</span>
            <span key={`t-${price}`} className="animate-in fade-in font-bold text-foreground duration-300">
              {formatPrice(price)}
            </span>
          </div>
          <div className="mb-3 rounded-sm bg-secondary/60 p-3">
            <div className="flex items-end justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Abonas hoy para apartar
              </span>
              {/* key fuerza el remontaje para que el valor nuevo entre con un fundido */}
              <span
                key={deposit}
                className="animate-in fade-in slide-in-from-bottom-1 text-3xl font-bold leading-none text-primary duration-300"
              >
                {formatPrice(deposit)}
              </span>
            </div>
            <p className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Saldo al tomar el transporte</span>
              <span key={`b-${balance}`} className="animate-in fade-in font-medium text-foreground duration-300">
                {formatPrice(balance)}
              </span>
            </p>
          </div>
          <p className="mb-4 min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
            {routeInfo.detail}
            {roundTripSaving > 0 && (
              <span className="font-medium text-primary">
                {" "}
                Ahorras {formatPrice(roundTripSaving)} frente a comprarlos por separado.
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className={`group/btn relative w-full overflow-hidden py-3.5 text-sm font-bold uppercase tracking-widest transition-all duration-300 ${
              justAdded
                ? "bg-foreground text-background"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:tracking-[0.2em]"
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {justAdded ? (
                <>
                  <Check className="h-4 w-4" />
                  Agregado al carrito
                </>
              ) : (
                "Apartar mi cupo con el 50%"
              )}
            </span>
            {!justAdded && (
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

type GiroDeRigoBookingProps = {
  open: boolean
  onToggle: () => void
}

export function GiroDeRigoBooking({ open, onToggle }: GiroDeRigoBookingProps) {
  return (
    <div className="overflow-hidden rounded-sm border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="giro-de-rigo-servicios"
        className="group/bar flex w-full items-center justify-between gap-4 bg-primary/5 px-6 py-4 text-left transition-colors duration-300 hover:bg-primary/10"
      >
        <span>
          <span className="block text-sm font-bold uppercase tracking-wider text-foreground">
            Reserva tu transporte al {GIRO_DE_RIGO_EVENT.name}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Cupos en bus y en van, con o sin bicicleta. Desde {formatPrice(100000)}.
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-primary transition-transform duration-500 ${
            open ? "rotate-180" : "group-hover/bar:translate-y-0.5"
          }`}
        />
      </button>

      <div id="giro-de-rigo-servicios" hidden={!open} className="border-t border-border">
        <div className="w-full overflow-hidden bg-[#0d3b32]">
          <Image
            src={assetUrl(GIRO_DE_RIGO_EVENT.banner)}
            alt={`${GIRO_DE_RIGO_EVENT.name} · ${GIRO_DE_RIGO_EVENT.edition}`}
            width={1316}
            height={676}
            className="block h-auto w-full"
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
        </div>

        <div className="px-6 py-10">
          <div className="travel-reveal mb-10" style={revealStyle(60)}>
            <h3 className="max-w-3xl text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl">
              Transporte privado premium <span className="text-primary">para ti y para tu bici</span>
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Nos encargamos del viaje completo para que tú solo pienses en rodar. Tú eliges el vehículo,
              el trayecto y si viajas con bicicleta; nosotros ponemos la logística, la asistencia mecánica
              y el cuidado de tu equipo.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Clock, label: "Ida", value: GIRO_DE_RIGO_EVENT.departure },
                { icon: LifeBuoy, label: "Regreso", value: GIRO_DE_RIGO_EVENT.returnTrip },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-sm border border-border bg-background p-4 transition-colors duration-300 hover:border-primary/50"
                >
                  <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {TRUST_STATS.length > 0 && (
            <div className="travel-reveal mb-10 grid grid-cols-2 gap-3 md:grid-cols-4" style={revealStyle(120)}>
              {TRUST_STATS.map((stat) => (
                <div key={stat.label} className="rounded-sm border border-border bg-background p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mb-12 grid gap-6 lg:grid-cols-2">
            {GIRO_DE_RIGO_SERVICES.map((service, i) => (
              <ServiceCard key={service.key} service={service} delay={160 + i * 110} />
            ))}
          </div>

          <div className="travel-reveal mb-12" style={revealStyle(400)}>
            <h4 className="mb-5 text-lg font-bold text-foreground">Por qué viajar con nosotros</h4>
            <div className="grid gap-4 md:grid-cols-2">
              {GUARANTEES.map((item) => (
                <div
                  key={item.title}
                  className="group/g flex items-start gap-3 rounded-sm border border-border bg-background p-5 transition-all duration-300 hover:border-primary/50 hover:bg-secondary/30"
                >
                  <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary transition-transform duration-300 group-hover/g:scale-110" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="travel-reveal mb-12" style={revealStyle(440)}>
            <h4 className="mb-5 text-lg font-bold text-foreground">Cómo apartas tu cupo</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-sm border border-primary/40 bg-primary/5 p-5">
                <Wallet className="mb-3 h-5 w-5 text-primary" />
                <p className="text-sm font-bold text-foreground">Abono del 50%</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{TRAVEL_POLICIES.deposit}</p>
              </div>
              <div className="rounded-sm border border-border bg-background p-5">
                <CalendarClock className="mb-3 h-5 w-5 text-primary" />
                <p className="text-sm font-bold text-foreground">Cancelaciones</p>
                <ul className="mt-1 flex flex-col gap-2">
                  {TRAVEL_POLICIES.cancellation.map((item) => (
                    <li key={item} className="text-sm leading-relaxed text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-sm border border-border bg-background p-5">
                <UserRoundCheck className="mb-3 h-5 w-5 text-primary" />
                <p className="text-sm font-bold text-foreground">¿No puedes viajar? Cede tu cupo</p>
                <ul className="mt-1 flex flex-col gap-2">
                  {TRAVEL_POLICIES.transfer.map((item) => (
                    <li key={item} className="text-sm leading-relaxed text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="travel-reveal" style={revealStyle(480)}>
            <h4 className="mb-5 text-lg font-bold text-foreground">Preguntas frecuentes</h4>
            <div className="flex flex-col gap-3">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group/f rounded-sm border border-border bg-background p-4 transition-colors duration-300 hover:border-primary/40"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground">
                    {faq.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-open/f:rotate-180" />
                  </summary>
                  <p className="mt-3 animate-in fade-in slide-in-from-top-1 text-sm leading-relaxed text-muted-foreground duration-300">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>

          <p className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground">
            Las imágenes de los vehículos son únicamente de referencia y pueden variar dependiendo del
            servicio contratado. "Sold out" corresponde a la inscripción al evento, que gestiona su
            organizador; los cupos de transporte de CERO.UNO se reservan aquí.
          </p>
        </div>
      </div>
    </div>
  )
}
