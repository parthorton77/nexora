import { AnimatePresence } from 'framer-motion';
import { useExperience } from '../../store/experienceStore';
import { TopBar } from './TopBar';
import { Toasts } from './Toasts';
import { TransitionOverlay } from './TransitionOverlay';
import { Hint } from './Hint';
import { ZoneDial } from './ZoneDial';
import { Companion } from './Companion';
import { SettingsPanel, ProfilePanel } from './SettingsPanel';
import { ProductPanel } from '../shopping/ProductPanel';
import { BagPanel } from '../shopping/BagPanel';
import { WishlistPanel } from '../shopping/WishlistPanel';
import { CheckoutPreview } from '../shopping/CheckoutPreview';
import { FittingPanel } from '../fitting-room/FittingPanel';
import { RunwayPanel } from '../fitting-room/RunwayPanel';

/** Everything DOM that floats over the 3D world. Contextual pieces appear only when needed. */
export function Interface() {
  const entered = useExperience((s) => s.entered);
  const panel = useExperience((s) => s.panel);
  if (!entered)
    return (
      <>
        <TransitionOverlay />
        <Toasts />
      </>
    );
  return (
    <>
      <TopBar />
      <Hint />
      <ZoneDial />
      <ProductPanel />
      <FittingPanel />
      <RunwayPanel />
      <Companion />
      <TransitionOverlay />
      <AnimatePresence>
        {panel === 'bag' && <BagPanel key="bag" />}
        {panel === 'wishlist' && <WishlistPanel key="wishlist" />}
        {panel === 'checkout' && <CheckoutPreview key="checkout" />}
        {panel === 'settings' && <SettingsPanel key="settings" />}
        {panel === 'profile' && <ProfilePanel key="profile" />}
      </AnimatePresence>
      <Toasts />
    </>
  );
}
