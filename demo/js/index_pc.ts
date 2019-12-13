import Nemetric from "../../src/nemetric";
new Nemetric({
  firstContentfulPaint: true,
  largestContentfulPaint: true,
  navigationTiming: true,
  networkInformation: true,
  dataConsumption:false,
  inApp: false,
  analyticsTracker: (data:any) => {
    console.log("report data:", JSON.stringify(data));
  }
});