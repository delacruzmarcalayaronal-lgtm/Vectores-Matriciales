import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Table';
import { useAuth } from '../../contexts/useAuth';

interface ProfileAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  ringClassName?: string;
  dotBorderClassName?: string;
  onClick?: () => void;
}

export function ProfileAvatar({
  size = 'md',
  ringClassName = 'ring-2 ring-white/20',
  dotBorderClassName = 'border-[#0F172A]',
  onClick,
}: ProfileAvatarProps) {
  const { user } = useAuth();

  return (
    <Link
      to="/perfil"
      onClick={onClick}
      className="relative inline-flex items-center justify-center rounded-full transition hover:ring-2 hover:ring-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label="Mi perfil"
      title="Mi perfil"
    >
      <Avatar name={user?.name || 'Usuario'} src={user?.avatar} size={size} className={ringClassName} />
      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 ${dotBorderClassName}`} />
    </Link>
  );
}
