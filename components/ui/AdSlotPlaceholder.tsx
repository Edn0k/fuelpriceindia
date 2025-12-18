type Props = {
    slot: "header" | "in_content" | "footer";
};

const slots: Record<Props["slot"], { label: string; size: string }> = {
    header: { label: "Header Banner", size: "728×90" },
    in_content: { label: "In-Content", size: "Responsive" },
    footer: { label: "Footer", size: "Responsive" },
};

export function AdSlotPlaceholder({ slot }: Props) {
    const meta = slots[slot];
    return (
        <div className="mt-6 rounded-xl border border-dashed border-border/20 bg-card p-4 text-center text-sm text-muted">
            {meta.label} Ad Slot ({meta.size})
        </div>
    );
}
