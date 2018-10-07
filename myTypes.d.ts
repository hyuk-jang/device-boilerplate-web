import { CU } from 'base-util-jh';
import { Moment } from 'moment';
import express from 'express';


const {Timer} = CU;
declare global {
  const Timer: Timer;
  const Moment: Moment;
}