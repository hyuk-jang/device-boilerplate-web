import { Server } from 'http';
import express from 'express';

import AdminModel from './models/templates/AdminModel';
import AnalysisModel from './models/templates/AnalysisModel';
import BiAuth from './models/templates/auth/BiAuth';
import BiDevice from './models/templates/BiDevice';
import BiModule from './models/templates/BiModule';
import BlockModel from './models/templates/BlockModel';
import ControlModel from './models/templates/ControlModel';
import PowerModel from './models/templates/PowerModel';
import RefineModel from './models/templates/RefineModel';
import WeatherModel from './models/templates/WeatherModel';

import MainControl from './src/Control';

declare global {
  const BiAuth: BiAuth;
  const BiModule: BiModule;
  const BiDevice: BiDevice;
  const AdminModel: AdminModel;
  const AnalysisModel: AnalysisModel;
  const PowerModel: PowerModel;
  const WeatherModel: WeatherModel;
  const BlockModel: BlockModel;
  const ControlModel: ControlModel;
  const RefineModel: RefineModel;
  const MainControl: MainControl;
  const httpServer: Server;
  const express: express;
}
