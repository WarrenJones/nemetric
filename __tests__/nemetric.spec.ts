import Nemetric from '../src/nemetric';
import mock, { MockDateNowValue } from './_mock';

describe('Nemetric', () => {
  let nemetric: Nemetric;
  let spy: jest.SpyInstance;

  beforeEach(() => {
    nemetric = new Nemetric({ ...mock.defaultNemetricConfig });
    mock.performance();
    (window as any).ga = undefined;
    (window as any).PerformanceObserver = mock.PerformanceObserver;
    (window as any).console.log = (n: any) => n;
    (window as any).console.warn = (n: any) => n;
    nemetric['observers']['firstPaint'] = () => 400;
    nemetric['observers']['firstContentfulPaint'] = () => 400;
    nemetric['observers']['firstInputDelay'] = () => 400;
    nemetric['observers']['dataConsumption'] = () => 400;
    nemetric['queue'] = {
      pushTask: (cb: any) => cb(),
    };
    nemetric['perfObservers'] = {};
  });

  afterEach(() => {
    if (spy) {
      spy.mockReset();
      spy.mockRestore();
    }
  });

  describe('config', () => {
    const instance = new Nemetric();

    it('should be defined', () => {
      expect(instance.config.firstContentfulPaint).toEqual(false);
      expect(instance.config.firstPaint).toEqual(false);
      expect(instance.config.firstInputDelay).toEqual(false);
      expect(instance.config.dataConsumption).toEqual(false);
      expect(instance.config.navigationTiming).toEqual(false);
      expect(instance.config.analyticsTracker).toBeDefined();
      expect(instance.config.logPrefix).toEqual('Nemetric.js:');
      expect(instance.config.logging).toEqual(true);
      expect(instance.config.maxMeasureTime).toEqual(15000);
      expect(instance.config.maxDataConsumption).toEqual(20000);
      expect(instance.config.warning).toEqual(false);
      expect(instance.config.debugging).toEqual(false);
    });
  });

  describe('constructor', () => {
    it('should run with config version A', () => {
      new Nemetric({
        firstContentfulPaint: true,
        firstPaint: true,
        firstInputDelay: true,
        dataConsumption: true,
      });
    });

    it('should run with config version B', () => {
      new Nemetric({
        firstContentfulPaint: true,
        firstPaint: true,
        firstInputDelay: true,
        dataConsumption: true,
      });
    });

    it('should run with config version C', () => {
      new Nemetric({
        firstContentfulPaint: true,
        firstPaint: true,
        firstInputDelay: true,
        dataConsumption: true,
        logging: false,
      });
    });

    it('should run with config version D', () => {
      new Nemetric({
        firstContentfulPaint: true,
        firstPaint: true,
        firstInputDelay: true,
        dataConsumption: true,
        warning: true,
        debugging: true,
      });
    });

    it('should run with config version E', () => {
      new Nemetric({
        firstContentfulPaint: true,
        firstPaint: true,
        firstInputDelay: true,
        dataConsumption: true,
        navigationTiming: true,
        warning: true,
        debugging: true,
      });
    });
  });

  describe('.observeFirstInputDelay', () => {
    (window as any).chrome = true;

    beforeEach(() => {
      nemetric = new Nemetric({
        firstPaint: false,
        firstContentfulPaint: false,
        firstInputDelay: true,
      });
      nemetric['observers']['firstInputDelay'] = () => 400;
      nemetric['queue'].pushTask = (cb: any) => cb();
    });

    it('should be a promise', () => {
      const promise = nemetric.observeFirstInputDelay;
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('.start()', () => {
    beforeEach(() => {
      nemetric = new Nemetric({ ...mock.defaultNemetricConfig });
    });

    it('should throw a logWarn if metricName is not passed', () => {
      spy = jest.spyOn(Nemetric as any, 'logWarn');
      nemetric.start('');
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith('Please provide a metric name');
    });

    it('should not throw a logWarn if param is correct', () => {
      spy = jest.spyOn(Nemetric as any, 'logWarn');
      nemetric.start('metricName');
      expect(spy.mock.calls.length).toEqual(0);
    });

    it('should call perf.mark', () => {
      spy = jest.spyOn((Nemetric as any).perf, 'mark');
      nemetric.start('metricName');
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith('metricName', 'start');
    });

    it('should throw a logWarn if recording already started', () => {
      spy = jest.spyOn(Nemetric as any, 'logWarn');
      nemetric.start('metricName');
      nemetric.start('metricName');
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith('Recording already started.');
    });
  });

  describe('.end()', () => {
    it('should throw a logWarn if param is not correct', () => {
      spy = jest.spyOn(Nemetric as any, 'logWarn');
      nemetric.end('');
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith('Please provide a metric name');
    });

    it('should throw a logWarn if param is correct and recording already stopped', () => {
      spy = jest.spyOn(nemetric as any, 'logWarn');
      nemetric.end('metricName');
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith('Recording already stopped.');
    });

    it('should call log() with correct params', () => {
      spy = jest.spyOn(nemetric, 'log');
      nemetric.config.logging = true;
      nemetric.start('metricName');
      nemetric.end('metricName');
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith({
        metricName: 'metricName',
        duration: 12346,
      });
    });

    it('should call sendTiming() with correct params', () => {
      spy = jest.spyOn(nemetric, 'sendTiming');
      nemetric.config.logging = true;
      nemetric.start('metricName');
      nemetric.end('metricName');
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith({
        metricName: 'metricName',
        duration: 12346,
      });
    });

    it('should add metrics properly', () => {
      nemetric = new Nemetric();
      nemetric.start('metricName');
      expect(nemetric['metrics']['metricName']).toBeDefined();
    });

    it('should delete metrics properly', () => {
      nemetric = new Nemetric();
      nemetric.start('metricName');
      nemetric.end('metricName');
      expect(nemetric['metrics']['metricName']).not.toBeDefined();
    });
  });

  describe('.start() and .end()', () => {
    it('should not throw a logWarn if param is correct', () => {
      spy = jest.spyOn(nemetric as any, 'logWarn');
      nemetric.start('metricName');
      nemetric.end('metricName');
      expect(spy).not.toHaveBeenCalled();
    });

    it('should call perf.mark() twice with the correct arguments', () => {
      spy = jest.spyOn((nemetric as any).perf, 'mark');
      nemetric.start('metricName');
      nemetric.end('metricName');
      expect(spy.mock.calls.length).toEqual(2);
    });

    it('should call perf.measure() with the correct arguments', () => {
      spy = jest.spyOn((nemetric as any).perf, 'measure');
      nemetric.start('metricName');
      nemetric.end('metricName');
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith('metricName', {
        end: MockDateNowValue,
        start: MockDateNowValue,
      });
    });
  });

  describe('.endPaint()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should call end() after the first setTimeout', () => {
      spy = jest.spyOn(nemetric, 'end');
      nemetric.endPaint('test').catch(console.error);
      jest.runAllTimers();
      expect(spy.mock.calls.length).toEqual(1);
    });
  });

  describe('.log()', () => {
    it('should not call window.console.log() if logging is disabled', () => {
      nemetric.config.logging = false;
      spy = jest.spyOn(window.console, 'log');
      nemetric.log({ metricName: '', duration: 0 });
      expect(spy).not.toHaveBeenCalled();
    });

    it('should call window.console.log() if logging is enabled', () => {
      nemetric.config.logging = true;
      spy = jest.spyOn(window.console, 'log');
      nemetric.log({ metricName: 'metricName', duration: 1235 });
      const text = '%c Nemetric: metricName 1235.00 ms';
      const style = 'color: #ff6d00;font-size:11px;';
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith(text, style);
    });

    it('should call logWarn if params are not correct', () => {
      spy = jest.spyOn(nemetric as any, 'logWarn');
      nemetric.log({ metricName: '', duration: 0 });
      const text = 'Please provide a metric name';
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith(text);
    });

    it('should not call window.console.log() if params are not correct', () => {
      spy = jest.spyOn(window.console, 'log');
      nemetric.log({ metricName: '', duration: 0 });
      expect(spy).not.toHaveBeenCalled();
    });

    it('should call window.console.log() if params are correct', () => {
      nemetric.config.logging = true;
      spy = jest.spyOn(window.console, 'log');
      nemetric.log({ metricName: 'metricName', duration: 1245 });
      const text = '%c Nemetric: metricName 1245.00 ms';
      const style = 'color: #ff6d00;font-size:11px;';
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith(text, style);
    });

    it('should call window.console.log() with data', () => {
      const data = {};
      nemetric.config.logging = true;
      spy = jest.spyOn(window.console, 'log');
      nemetric.log({ metricName: 'metricName', data });
      const text = '%c Nemetric: metricName ';
      const style = 'color: #ff6d00;font-size:11px;';
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith(text, style, data);
    });
  });

  describe('.logDebug()', () => {
    it('should not call window.console.log() if debugging is disabled', () => {
      nemetric.config.debugging = false;
      spy = jest.spyOn(window.console, 'log');
      nemetric.logDebug('', 0);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should call window.console.log() if debugging is enabled', () => {
      nemetric.config.debugging = true;
      spy = jest.spyOn(window.console, 'log');
      nemetric.logDebug('metricName', 1235);
      const text = `nemetric debugging metricName:`;
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith(text, 1235);
    });
  });

  describe('.sendTiming()', () => {
    it('should not call analyticsTracker() if isHidden is true', () => {
      nemetric.config.analyticsTracker = ({ metricName, duration }) => {};
      spy = jest.spyOn(nemetric.config, 'analyticsTracker');
      nemetric['isHidden'] = true;
      (Nemetric as any).sendTiming({ metricName: 'metricName', duration: 123 });
      expect(spy).not.toHaveBeenCalled();
    });

    it('should call analyticsTracker() if analyticsTracker is defined', () => {
      nemetric.config.analyticsTracker = ({ metricName, duration }) => {};
      spy = jest.spyOn(nemetric.config, 'analyticsTracker');
      (nemetric as any).sendTiming({ metricName: 'metricName', duration: 123 });
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith({
        metricName: 'metricName',
        duration: 123,
      });
    });

    it('should call analyticsTracker with the browse Object when browserTracker is true', () => {
      nemetric.config.analyticsTracker = ({ metricName, duration }) => {};
      (nemetric as any).browser = {
        name: 'browserName',
        os: 'browserOS',
      };
      spy = jest.spyOn(nemetric.config, 'analyticsTracker');
      (nemetric as any).sendTiming({ metricName: 'metricName', duration: 123 });
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith({
        metricName: 'metricName',
        duration: 123,
        browser: (nemetric as any).browser,
      });
    });

    it('should call analyticsTracker with the browse undefined when browserTracker is false', () => {
      nemetric.config.analyticsTracker = ({ metricName, duration }) => {};
      (Nemetric as any).browser = {
        name: 'browserName',
        os: 'browserOS',
      };
      spy = jest.spyOn(nemetric.config, 'analyticsTracker');
      (nemetric as any).sendTiming({ metricName: 'metricName', duration: 123 });
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith({
        metricName: 'metricName',
        duration: 123,
      });
    });
  });

  describe('.initPerformanceObserver()', () => {
    it('should set observeFirstPaint when firstPaint is true', () => {
      nemetric.config.firstPaint = true;
      (nemetric as any).initPerformanceObserver();
      expect(nemetric.observeFirstPaint).toBeDefined();
    });

    it('should set observeFirstPaint when firstContentfulPaint is true', () => {
      nemetric.config.firstContentfulPaint = true;
      (nemetric as any).initPerformanceObserver();
      expect(nemetric.observeFirstPaint).toBeDefined();
    });

    it('should not set observeFirstPaint when firstPaint or firstContentfulPaint are false', () => {
      nemetric.config.firstPaint = false;
      nemetric.config.firstContentfulPaint = false;
      (nemetric as any).initPerformanceObserver();
      expect(nemetric.observeFirstPaint).not.toBeDefined();
    });

    it('should set observeDataConsumption when dataConsumption is true', () => {
      nemetric.config.dataConsumption = true;
      (nemetric as any).initPerformanceObserver();
      expect(nemetric.observeDataConsumption).toBeDefined();
    });

    it('should not set observeDataConsumption when dataConsumption is false', () => {
      nemetric.config.dataConsumption = false;
      (nemetric as any).initPerformanceObserver();
      expect(nemetric.observeDataConsumption).not.toBeDefined();
    });
  });
  describe('.checkMetricName()', () => {
    it('should return "true" when provided a metric name', () => {
      const value = (nemetric as any).checkMetricName('metricName');
      expect(value).toEqual(true);
    });

    it('should call logWarn when not provided a metric name', () => {
      spy = jest.spyOn(Nemetric as any, 'logWarn');
      (Nemetric as any).checkMetricName();
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith('Please provide a metric name');
    });

    it('should return "false" when not provided a metric name', () => {
      const value = (Nemetric as any).checkMetricName();
      expect(value).toEqual(false);
    });
  });

  describe('.didVisibilityChange()', () => {
    it('should keep "hidden" default value when is false', () => {
      nemetric['didVisibilityChange']();
      expect(nemetric['isHidden']).toEqual(false);
    });

    it('should set "hidden" value when is true', () => {
      nemetric['isHidden'] = false;
      jest.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      nemetric['didVisibilityChange']();
      expect(nemetric['isHidden']).toEqual(true);
    });

    it('should keep "hidden" value when changes to false', () => {
      nemetric['isHidden'] = true;
      jest.spyOn(document, 'hidden', 'get').mockReturnValue(false);
      nemetric['didVisibilityChange']();
      expect(nemetric['isHidden']).toEqual(true);
    });
  });

  describe('.performanceObserverCb()', () => {
    beforeEach(() => {
      nemetric.config.firstPaint = true;
      nemetric.config.firstContentfulPaint = true;
      (Nemetric as any).perfObservers.firstContentfulPaint = {
        disconnect: () => {},
      };
      (Nemetric as any).perfObservers.firstInputDelay = {
        disconnect: () => {},
      };
    });

    it('should call logMetric() with the correct arguments', () => {
      spy = jest.spyOn(Nemetric as any, 'logMetric');
      (Nemetric as any).performanceObserverCb({
        entries: mock.entries,
        entryName: 'first-paint',
        metricLog: 'First Paint',
        metricName: 'firstPaint',
        valueLog: 'startTime',
      });
      (Nemetric as any).performanceObserverCb({
        entries: mock.entries,
        entryName: 'first-contentful-paint',
        metricLog: 'First Contentful Paint',
        metricName: 'firstContentfulPaint',
        valueLog: 'startTime',
      });
      expect(spy.mock.calls.length).toEqual(2);
      expect(spy).toHaveBeenCalledWith(1, 'First Paint', 'firstPaint');
      expect(spy).toHaveBeenCalledWith(
        1,
        'First Contentful Paint',
        'firstContentfulPaint',
      );
    });

    it('should not call logMetric() when firstPaint and firstContentfulPaint is false', () => {
      nemetric.config.firstPaint = false;
      nemetric.config.firstContentfulPaint = false;
      spy = jest.spyOn(nemetric as any, 'logMetric');
      (nemetric as any).performanceObserverCb({
        entries: mock.entries,
        entryName: 'first-paint',
        metricLog: 'First Paint',
        metricName: 'firstPaint',
        valueLog: 'startTime',
      });
      (nemetric as any).performanceObserverCb({
        entries: mock.entries,
        entryName: 'first-contentful-paint',
        metricLog: 'First Contentful Paint',
        metricName: 'firstContentfulPaint',
        valueLog: 'startTime',
      });
      expect(spy).not.toHaveBeenCalled();
    });

    it('should call disconnect() for firstInputDelay when metricName is firstInputDelay', () => {
      spy = jest.spyOn(
        (Nemetric as any).perfObservers.firstInputDelay,
        'disconnect',
      );
      (Nemetric as any).performanceObserverCb({
        entries: [],
        metricLog: 'First Input Delay',
        metricName: 'firstInputDelay',
        valueLog: 'duration',
      });
      expect(spy.mock.calls.length).toEqual(1);
    });

    it('should not call disconnect() for firstInputDelay when metricName is not firstInputDelay', () => {
      spy = jest.spyOn(
        (Nemetric as any).perfObservers.firstInputDelay,
        'disconnect',
      );
      (Nemetric as any).performanceObserverCb({
        entries: [],
        metricLog: 'First Input Delay',
        metricName: 'firstInputDelay',
        valueLog: 'duration',
      });
      expect(spy.mock.calls.length).toEqual(1);
    });
  });

  describe('.performanceObserverResourceCb()', () => {
    beforeEach(() => {
      nemetric.config.dataConsumption = true;
      (nemetric as any).perfObservers.dataConsumption = { disconnect: () => {} };
    });

    it('should dataConsumption be 0 when entries are empty', () => {
      (nemetric as any).performanceObserverResourceCb({
        entries: [],
      });
      expect(nemetric.dataConsumption).toEqual(0);
    });

    it('should float the dataConsumption result', () => {
      nemetric.dataConsumption = 0;
      (nemetric as any).performanceObserverResourceCb({
        entries: [
          {
            decodedBodySize: 12345,
          },
        ],
      });
      expect(nemetric.dataConsumption).toEqual(12.35);
    });

    it('should sum the dataConsumption result', () => {
      nemetric.dataConsumption = 0;
      (nemetric as any).performanceObserverResourceCb({
        entries: [
          {
            decodedBodySize: 12345,
          },
          {
            decodedBodySize: 10000,
          },
        ],
      });
      expect(nemetric.dataConsumption).toEqual(22.35);
    });
  });

  describe('.digestFirstPaintEntries()', () => {
    it('should call performanceObserver()', () => {
      spy = jest.spyOn(nemetric as any, 'performanceObserverCb');
      nemetric['digestFirstPaintEntries']([]);
      expect(spy.mock.calls.length).toEqual(2);
      expect(spy).toHaveBeenCalledWith({
        entries: [],
        entryName: 'first-paint',
        metricLog: 'First Paint',
        metricName: 'firstPaint',
        valueLog: 'startTime',
      });
      expect(spy).toHaveBeenCalledWith({
        entries: [],
        entryName: 'first-contentful-paint',
        metricLog: 'First Contentful Paint',
        metricName: 'firstContentfulPaint',
        valueLog: 'startTime',
      });
    });
  });

  describe('.initFirstPaint()', () => {
    beforeEach(() => {
      nemetric.config.firstPaint = true;
      nemetric.config.firstContentfulPaint = true;
    });

    it('should call performanceObserver()', () => {
      spy = jest.spyOn(nemetric['perf'], 'performanceObserver');
      (window as any).chrome = true;
      (window as any).PerformanceObserver = mock.PerformanceObserver;
      nemetric['initFirstPaint']();
      expect(spy.mock.calls.length).toEqual(1);
    });

    it('should throw a logWarn if fails', () => {
      spy = jest.spyOn(nemetric as any, 'logWarn');
      (window as any).chrome = true;
      mock.PerformanceObserver.simulateErrorOnObserve = true;
      (window as any).PerformanceObserver = mock.PerformanceObserver;
      nemetric['initFirstPaint']();
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith('initFirstPaint failed');
    });
  });

  describe('.digestFirstInputDelayEntries()', () => {
    it('should call performanceObserver()', () => {
      spy = jest.spyOn(nemetric as any, 'performanceObserverCb');
      nemetric['digestFirstInputDelayEntries']([]);
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith({
        entries: [],
        metricLog: 'First Input Delay',
        metricName: 'firstInputDelay',
        valueLog: 'duration',
      });
    });

    it('should call disconnectDataConsumption()', () => {
      spy = jest.spyOn(nemetric as any, 'disconnectDataConsumption');
      nemetric['digestFirstInputDelayEntries']([]);
      expect(spy.mock.calls.length).toEqual(1);
    });
  });

  describe('.initFirstInputDelay()', () => {
    beforeEach(() => {
      nemetric.config.firstInputDelay = true;
    });

    it('should call performanceObserver()', () => {
      spy = jest.spyOn(nemetric['perf'], 'performanceObserver');
      (window as any).chrome = true;
      (window as any).PerformanceObserver = mock.PerformanceObserver;
      nemetric['initFirstInputDelay']();
      expect(spy.mock.calls.length).toEqual(1);
    });

    it('should throw a logWarn if fails', () => {
      spy = jest.spyOn(nemetric as any, 'logWarn');
      (window as any).chrome = true;
      mock.PerformanceObserver.simulateErrorOnObserve = true;
      (window as any).PerformanceObserver = mock.PerformanceObserver;
      nemetric['initFirstInputDelay']();
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith('initFirstInputDelay failed');
    });
  });

  describe('.disconnectDataConsumption()', () => {
    beforeEach(() => {
      nemetric.dataConsumption = 10;
      (Nemetric as any).perfObservers.dataConsumption = { disconnect: () => {} };
    });

    it('should call logMetric() with the correct arguments', () => {
      spy = jest.spyOn(nemetric as any, 'logMetric');
      (nemetric as any).disconnectDataConsumption();
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith(
        nemetric.dataConsumption,
        'Data Consumption',
        'dataConsumption',
        'Kb',
      );
    });

    it('should call disconnect()', () => {
      spy = jest.spyOn(
        (nemetric as any).perfObservers.dataConsumption,
        'disconnect',
      );
      (nemetric as any).disconnectDataConsumption();
      expect(spy.mock.calls.length).toEqual(1);
    });
  });

  describe('.initDataConsumption()', () => {
    beforeEach(() => {
      nemetric.config.dataConsumption = true;
      (nemetric as any).perfObservers.dataConsumption = { disconnect: () => {} };
    });

    it('should call performanceObserver()', () => {
      spy = jest.spyOn(nemetric['perf'], 'performanceObserver');
      (window as any).chrome = true;
      (window as any).PerformanceObserver = mock.PerformanceObserver;
      nemetric['initDataConsumption']();
      expect(spy.mock.calls.length).toEqual(1);
    });

    it('should call disconnectDataConsumption() after the setTimeout', () => {
      jest.spyOn(nemetric['perf'], 'performanceObserver');
      spy = jest.spyOn(nemetric as any, 'disconnectDataConsumption');
      (window as any).chrome = true;
      (window as any).PerformanceObserver = mock.PerformanceObserver;
      nemetric['initDataConsumption']();
      jest.runAllTimers();
      expect(spy.mock.calls.length).toEqual(1);
    });

    it('should throw a logWarn if fails', () => {
      spy = jest.spyOn(nemetric as any, 'logWarn');
      (window as any).chrome = true;
      mock.PerformanceObserver.simulateErrorOnObserve = true;
      (window as any).PerformanceObserver = mock.PerformanceObserver;
      nemetric['initDataConsumption']();
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith('initDataConsumption failed');
    });
  });

  describe('.onVisibilityChange()', () => {
    it('should not call document.addEventListener() when document.hidden is undefined', () => {
      spy = jest.spyOn(document, 'addEventListener');
      jest.spyOn(document, 'hidden', 'get').mockReturnValue(undefined as any);
      (nemetric as any).onVisibilityChange();
      expect(spy.mock.calls.length).toEqual(0);
    });

    it('should call document.addEventListener() with the correct argument', () => {
      spy = jest.spyOn(document, 'addEventListener');
      jest.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      (nemetric as any).onVisibilityChange();
      expect(spy.mock.calls.length).toEqual(1);
      expect(document.addEventListener).toHaveBeenLastCalledWith(
        'visibilitychange',
        nemetric['didVisibilityChange'],
      );
    });
  });

  describe('.logMetric()', () => {
    it('should call log() with the correct arguments', () => {
      spy = jest.spyOn(nemetric, 'log');
      (nemetric as any).logMetric(
        1,
        'First Contentful Paint',
        'firstContentfulPaint',
      );
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith({
        metricName: 'First Contentful Paint',
        duration: nemetric.firstContentfulPaintDuration,
        suffix: 'ms',
      });
    });

    it('should call sendTiming() with the correct arguments', () => {
      spy = jest.spyOn(nemetric as any, 'sendTiming');
      (nemetric as any).logMetric(
        1,
        'First Contentful Paint',
        'firstContentfulPaint',
      );
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith({
        metricName: 'firstContentfulPaint',
        duration: nemetric.firstContentfulPaintDuration,
      });
    });

    it('should not call sendTiming() when duration is higher of config.maxMeasureTime', () => {
      spy = jest.spyOn(Nemetric as any, 'sendTiming');
      (Nemetric as any).logMetric(
        20000,
        'First Contentful Paint',
        'firstContentfulPaint',
      );
      expect(spy.mock.calls.length).toEqual(0);
    });

    it('should not call sendTiming() when dataConsumption is higher of config.maxDataConsumption', () => {
      spy = jest.spyOn(nemetric as any, 'sendTiming');
      (nemetric as any).logMetric(25000, 'Data Consumption', 'dataConsumption');
      expect(spy.mock.calls.length).toEqual(0);
    });

    it('should Nemetric.firstContentfulPaintDuration be equal to duration', () => {
      (nemetric as any).logMetric(
        1,
        'First Contentful Paint',
        'firstContentfulPaint',
      );
      expect(nemetric.firstContentfulPaintDuration).toEqual(1);
    });

    it('should Nemetric.firstInputDelayDuration be equal to duration', () => {
      (nemetric as any).logMetric(2, 'First Input Delay', 'firstInputDelay');
      expect(nemetric.firstInputDelayDuration).toEqual(2);
    });
  });

  describe('.logNavigationTiming()', () => {
    it('should call log() with the correct arguments', () => {
      spy = jest.spyOn(nemetric, 'log');
      (nemetric as any).logNavigationTiming();
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith({
        metricName: 'NavigationTiming',
        data: {},
        suffix: '',
      });
    });

    it('should call sendTiming() with the correct arguments', () => {
      spy = jest.spyOn(nemetric, 'sendTiming');
      (nemetric as any).logNavigationTiming();
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith({
        metricName: 'NavigationTiming',
        data: {},
      });
    });
  });

  describe('.logWarn()', () => {
    it('should throw a console.warn if config.warning is true', () => {
      spy = jest.spyOn(window.console, 'warn');
      nemetric.config.warning = true;
      (nemetric as any).logWarn('message');
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith(nemetric.config.logPrefix, 'message');
    });

    it('should not throw a console.warn if config.warning is false', () => {
      spy = jest.spyOn(window.console, 'warn');
      nemetric.config.warning = false;
      (nemetric as any).logWarn('message');
      expect(spy.mock.calls.length).toEqual(0);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not throw a console.warn if config.logging is false', () => {
      spy = jest.spyOn(window.console, 'warn');
      nemetric.config.warning = true;
      nemetric.config.logging = false;
      (nemetric as any).logWarn('message');
      expect(spy.mock.calls.length).toEqual(0);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
