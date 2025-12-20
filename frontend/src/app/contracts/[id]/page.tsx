"use client"

import { useParams, useSearchParams } from "next/navigation"
import { ContractDetailsPage } from "@/components/pages/contract-details-page"

export default function Page() {
    const params = useParams()
    const searchParams = useSearchParams()
    const id = params.id as string
    const created = searchParams.get('created') === 'success'

    return <ContractDetailsPage id={id} created={created} />
}
