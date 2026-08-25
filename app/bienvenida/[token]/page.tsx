import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { SectionDivider } from "@/components/section-divider"
import { getLeadByToken, getCouponCodeForLead } from "@/lib/db-welcome-coupon"
import { WelcomeCouponActivationForm } from "@/components/welcome-coupon-activation-form"

export const metadata: Metadata = {
  title: "Activa tu cupón | CERO.UNO",
}

export const revalidate = 0

export default async function BienvenidaActivarPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const lead = await getLeadByToken(token)
  if (!lead) notFound()

  const couponCode = await getCouponCodeForLead(lead.coupon_id)
  if (!couponCode) notFound()

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="section-light relative bg-background px-4 py-16 lg:px-8">
          <SectionDivider />
          <WelcomeCouponActivationForm
            token={token}
            couponCode={couponCode}
            alreadyActivated={!!lead.activated_at}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
