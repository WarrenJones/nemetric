import Nemetric from "../../src/nemetric";
new Nemetric({
  firstContentfulPaint: true,
  largestContentfulPaint: true,
  navigationTiming: true,
  networkInformation: true,
  dataConsumption:false,
  analyticsTracker: (data) => {
    console.log("report data:", JSON.stringify(data));
  }
});