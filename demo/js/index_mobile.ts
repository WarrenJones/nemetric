import Nemetric from "../../src/nemetric";
new Nemetric({
  firstContentfulPaint: true,
  largestContentfulPaint: true,
  navigationTiming: true,
  networkInformation: true,
  dataConsumption:false,
  analyticsTracker: (data) => {
    console.log("report data:", JSON.stringify(data));
    //Report the data to the server
    // axios.get('/nemetric-data', {
    //   params: data
    // })
    // .then(function (response) {
    //   console.log(response);
    // })
    // .catch(function (error) {
    //   console.log(error);
    // });
  }
});