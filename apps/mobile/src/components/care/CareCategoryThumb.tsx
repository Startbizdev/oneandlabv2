import { CarePictogram } from '@/components/ui/CarePictogram';

interface Props {
  imageUrl?: string | null;
  icon?: string | null;
  label?: string;
  appointmentType?: string | null;
  size?: number;
}

export function CareCategoryThumb({ imageUrl, icon, label = '', appointmentType, size = 28 }: Props) {
  return <CarePictogram label={label} type={appointmentType} icon={icon} imageUrl={imageUrl} size={size} />;
}
