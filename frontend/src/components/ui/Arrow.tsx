export function Arrow({ back = false }: { back?: boolean }) {
  return <span aria-hidden="true">{back ? "↗" : "→"}</span>;
}

