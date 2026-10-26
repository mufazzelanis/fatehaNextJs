import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShell } from "@/components/landing/public-shell";
import { TrackForm } from "./track-form";

export const metadata: Metadata = { title: "অর্ডার ট্র্যাক করুন" };

export default function TrackPage({ searchParams }: PageProps<"/track">) {
  return (
    <PublicShell>
      <div className="container-x max-w-2xl py-12 sm:py-16">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">আপনার অর্ডার ট্র্যাক করুন</h1>
          <p className="mt-3 text-lg text-slate-600">অর্ডার নাম্বার ও যে মোবাইল নাম্বার দিয়ে অর্ডার করেছেন তা দিন।</p>
        </div>
        <Suspense fallback={<div className="mt-10 h-56 animate-pulse rounded-3xl bg-slate-100" />}>
          <TrackFormWithQuery searchParams={searchParams} />
        </Suspense>
      </div>
    </PublicShell>
  );
}

async function TrackFormWithQuery({ searchParams }: Pick<PageProps<"/track">, "searchParams">) {
  const { no } = await searchParams;
  return <TrackForm defaultOrderNo={typeof no === "string" ? no : ""} />;
}
