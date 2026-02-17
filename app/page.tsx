import AccessGate from "@/components/AccessGate";

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4">
            <AccessGate />
        </main>
    );
}
