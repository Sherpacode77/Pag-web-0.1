import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Política de Privacidad y Términos y Condiciones",
  description: "Política de privacidad, tratamiento de datos personales, y términos y condiciones de CERO.UNO.",
}

export default function PoliticaPrivacidadPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-2">
            CERO.UNO
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            Política de Privacidad y Términos y Condiciones
          </h1>

          <div className="mt-10 space-y-8 text-sm text-muted-foreground leading-relaxed">
            <section>
              <h2 className="font-bold text-foreground text-base mb-2">1. Aceptación</h2>
              <p>
                Al realizar una compra en CERO.UNO aceptas estos Términos y Condiciones y nuestra
                Política de Privacidad. Si no estás de acuerdo, no debes continuar con el proceso de compra.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-foreground text-base mb-2">2. Tratamiento de datos personales</h2>
              <p>
                Los datos de contacto y envío que proporcionas (nombre, correo, teléfono, documento de
                identidad, dirección) se usan únicamente para procesar tu pedido, coordinar el envío o
                retiro, y contactarte sobre el estado de tu compra. No se comparten con terceros salvo
                lo necesario para el envío (transportadora) y el procesamiento de pago (MercadoPago).
              </p>
              <p className="mt-2">
                Al aceptar los términos y condiciones, nos das facultad como CERO.UNO de tratar tus
                datos para brindarte información relevante, protegiendo tu información y respetando
                toda la normativa vigente referente a protección de datos. En caso de que no desees
                recibir ningún tipo de oferta, promoción o información de valor en futuras
                oportunidades, puedes enviarnos un correo a{" "}
                <a href="mailto:equipo@cerounobikes.com" className="text-foreground underline">
                  equipo@cerounobikes.com
                </a>{" "}
                para eliminar tu información.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-foreground text-base mb-2">3. Precios y pagos</h2>
              <p>
                Los precios están expresados en pesos colombianos (COP) e incluyen los impuestos
                aplicables. El pago se procesa a través de MercadoPago. El pedido queda confirmado
                únicamente cuando el pago es aprobado.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-foreground text-base mb-2">4. Despachos y envíos</h2>
              <p>
                Tiempo de entrega máximo luego de pagada la orden: 5 días hábiles para Bogotá y 7 días
                hábiles en el resto del país. Para la opción de retiro, coordinaremos contigo el lugar
                y horario disponible.
              </p>
              <p className="mt-2">
                En caso de que el producto no haya podido ser entregado por ausencia, cambio de
                residencia o algún imprevisto, nos comunicaremos contigo para coordinar la entrega
                mediante punto físico o como envío, teniendo en cuenta que pueden generarse cargos
                adicionales de envío.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-foreground text-base mb-2">5. Personalizaciones</h2>
              <p>
                El tiempo máximo de despacho para personalizaciones es de 1 mes. En caso de que la(s)
                personalización(es) no haya(n) sido despachada(s) en este periodo por retrasos en su
                fabricación, el cliente puede solicitar el reintegro del dinero, el cual se realizará
                antes de los siguientes 5 días hábiles luego de su solicitud.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-foreground text-base mb-2">6. Garantías y devoluciones</h2>
              <p>
                Las garantías son válidas únicamente cuando haya defectos funcionales demostrados,
                generados por parte del fabricante durante el proceso de fabricación o despacho, que
                afecten directamente las características del producto. Los detalles estéticos no son
                motivo de garantía.
              </p>
              <p className="mt-2">
                Los costos de devolución serán asumidos por parte del comprador. Si el producto debe
                ser reemplazado o reparado por motivo de garantía, CERO.UNO se hará cargo del 50% de
                los costos de envío y el otro 50% será asumido por parte del comprador.
              </p>
              <p className="mt-2">
                En caso de devolución, el producto debe pasar por una revisión de sus condiciones. Si
                se determina que la afectación funcional no fue generada por parte del fabricante o
                durante su despacho, sino que se debe a un uso indebido, el comprador será notificado
                y no será efectivo su reembolso, reemplazo o reparación.
              </p>
              <p className="mt-2">
                Todos los productos que hayan sido adquiridos mediante una promoción pierden la
                cobertura de la garantía, ya que son productos de segunda selección o liquidación.
              </p>
              <p className="mt-2">
                Puedes solicitar cambios o devoluciones dentro de los términos que establece la ley
                colombiana de protección al consumidor. Contáctanos por WhatsApp para iniciar el proceso.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-foreground text-base mb-2">7. Contacto</h2>
              <p>
                Para preguntas sobre estos términos o el tratamiento de tus datos personales, escríbenos
                por los canales de contacto disponibles en el sitio o al correo{" "}
                <a href="mailto:equipo@cerounobikes.com" className="text-foreground underline">
                  equipo@cerounobikes.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
