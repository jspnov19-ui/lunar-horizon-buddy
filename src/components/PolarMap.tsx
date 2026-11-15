import type { LandingSite } from '@/lib/sites';
import { LunarGlobe } from '@/components/LunarGlobe';

interface Props {
  sites: LandingSite[];
  selected: string[];
  detailId: string;
  currentTimeMs: number;
  onPick: (id: string) => void;
  onAdd: (lat: number, lon: number) => void;
}

/** Three.js Moon globe with planner site selection and custom coordinate picking. */
export function PolarMap(props: Props) {
  return <LunarGlobe {...props} />;
}
