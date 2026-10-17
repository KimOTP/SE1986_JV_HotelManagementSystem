/* eslint-disable react-refresh/only-export-components */
import {
  CupHot,
  Droplet,
  ShieldLock,
  Snow,
  Sun,
  Tv,
  Wifi,
  CheckCircle,
} from 'react-bootstrap-icons';
export const amenityIcons = { Wifi, Snow, Tv, Droplet, CupHot, ShieldLock, Sun };
export default function AmenityIcon({ iconKey, size = 18 }) {
  const Icon = amenityIcons[iconKey] || CheckCircle;
  return <Icon size={size} aria-hidden="true" />;
}
