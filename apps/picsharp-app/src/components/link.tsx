import { useLocation, Link as Link2, LinkProps } from 'react-router';
import { useNavigate } from '@/hooks/useNavigate';
import { isString, isFunction } from 'radash';
import { forwardRef } from 'react';

const Link = forwardRef<React.RefAttributes<HTMLAnchorElement>, LinkProps>((props, ref) => {
  const { children, to, viewTransition = true, onClick, ...restProps } = props;
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    isFunction(onClick) && onClick(event);
    event.preventDefault();
    const toPath = isString(to) ? to : to.pathname;
    if (location.pathname.startsWith(toPath)) {
      return;
    }
    navigate(to);
  };

  return (
    <Link2
      ref={ref as React.LegacyRef<HTMLAnchorElement>}
      to={to}
      viewTransition={viewTransition}
      onClick={handleClick}
    >
      {children}
    </Link2>
  );
});

export default Link;
