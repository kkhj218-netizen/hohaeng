import { permanentRedirect } from 'next/navigation';

export default function LegacyToolsRedirect() {
  permanentRedirect('/money');
}
