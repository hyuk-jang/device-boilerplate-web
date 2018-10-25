import BiAuth from './models/templates/auth/BiAuth';
import BiModule from './models/templates/BiModule';
import '../default-intelligence'

declare global {
  const BiAuth: BiAuth;
  const BiModule: BiModule;
}
