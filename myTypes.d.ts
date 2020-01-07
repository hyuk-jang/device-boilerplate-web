import { Server } from "http";
import express from "express";

import BiModule from "./models/templates/BiModule";
import BiAuth from "./models/templates/auth/BiAuth";
import BiDevice from "./models/templates/BiDevice";
import AdminModel from "./models/templates/AdminModel";
import PowerModel from "./models/templates/PowerModel";
import WeatherModel from "./models/templates/WeatherModel";
import BlockModel from "./models/templates/BlockModel";
import RefineModel from "./models/templates/RefineModel";

import MainControl from "./src/Control";

declare global {
  const BiAuth: BiAuth;
  const BiModule: BiModule;
  const BiDevice: BiDevice;
  const AdminModel: AdminModel;
  const PowerModel: PowerModel;
  const WeatherModel: WeatherModel;
  const BlockModel: BlockModel;
  const RefineModel: RefineModel;
  const MainControl: MainControl;
  const httpServer: Server;
  const express: express;
}
