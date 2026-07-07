"use client"

import { X } from "lucide-react"

interface TermsModalProps {
  onClose: () => void
}

export function TermsModal({ onClose }: TermsModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wider">
            Términos y Condiciones
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground">
            Texto provisional pendiente de revisión legal — reemplazar antes de operar en producción.
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-1">1. Aceptación</h3>
            <p>
              Al realizar una compra en CERO.UNO aceptas estos Términos y Condiciones y nuestra
              Política de Privacidad. Si no estás de acuerdo, no debes continuar con el proceso de compra.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-1">2. Datos personales</h3>
            <p>
              Los datos de contacto y envío que proporcionas (nombre, correo, teléfono, documento de
              identidad, dirección) se usan únicamente para procesar tu pedido, coordinar el envío o
              retiro, y contactarte sobre el estado de tu compra. No se comparten con terceros salvo
              lo necesario para el envío (transportadora) y el procesamiento de pago (MercadoPago).
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-1">3. Precios y pagos</h3>
            <p>
              Los precios están expresados en pesos colombianos (COP) e incluyen los impuestos
              aplicables. El pago se procesa a través de MercadoPago. El pedido queda confirmado
              únicamente cuando el pago es aprobado.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-1">4. Envíos y retiros</h3>
            <p>
              Los tiempos de entrega varían según la ciudad de destino. Para la opción de retiro,
              coordinaremos contigo el lugar y horario disponible.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-1">5. Cambios y devoluciones</h3>
            <p>
              Puedes solicitar cambios o devoluciones dentro de los términos que establece la ley
              colombiana de protección al consumidor. Contáctanos por WhatsApp para iniciar el proceso.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-1">6. Contacto</h3>
            <p>
              Para preguntas sobre estos términos o el tratamiento de tus datos personales, escríbenos
              por los canales de contacto disponibles en el sitio.
            </p>
          </section>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-bold hover:bg-primary/90"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
