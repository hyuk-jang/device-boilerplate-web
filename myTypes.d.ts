import BiAuth from './models/templates/auth/BiAuth';
import BiModule from './models/templates/BiModule';
import BiDevice from './models/templates/BiDevice';
import PowerModel from './models/templates/PowerModel';
import '../default-intelligence'

declare global {
  const BiAuth: BiAuth;
  const BiModule: BiModule;
  const BiDevice: BiDevice;
  const PowerModel: PowerModel;
}
