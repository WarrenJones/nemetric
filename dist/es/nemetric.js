"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Nemo metrics!
 * 统计页面性能
 * 1.First Paint (FP),
 * 2.First Contentful Paint (FCP)
 * 3.First Input Delay (FID) same as TTI
 * 4.Hero Element
 * 5.Navigation Timing
 */
var detect_browser_1 = require("./detect-browser");
var idle_queue_1 = require("./idle-queue");
var performance_1 = require("./performance");
var Nemetric = /** @class */ (function () {
    function Nemetric(options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        this.config = {
            // Metrics
            firstContentfulPaint: false,
            firstPaint: false,
            firstInputDelay: false,
            dataConsumption: false,
            navigationTiming: false,
            // Logging
            logPrefix: 'Nemetric:',
            logging: true,
            maxMeasureTime: 15000,
            maxDataConsumption: 20000,
            warning: false,
            debugging: false,
            //默认是app端内应用
            inApp: true,
            sampleRate: 1
        };
        this.firstPaintDuration = 0;
        this.firstContentfulPaintDuration = 0;
        this.firstInputDelayDuration = 0;
        this.dataConsumption = 0;
        this.isHidden = false;
        this.logMetricWarn = 'Please provide a metric name';
        this.metrics = {};
        this.observers = {};
        this.perfObservers = {};
        this.didVisibilityChange = function () {
            if (document.hidden) {
                _this.isHidden = document.hidden;
            }
        };
        // Extend default config with external options
        this.config = Object.assign({}, this.config, options);
        this.perf = new performance_1.default();
        // Exit from Nemetric when basic Web Performance APIs aren't supported
        if (!performance_1.default.supported()) {
            return;
        }
        this.browser = detect_browser_1.detect();
        // Checks if use Performance or the EmulatedPerformance instance
        if (performance_1.default.supportedPerformanceObserver()) {
            this.initPerformanceObserver();
        }
        // Init visibilitychange listener
        this.onVisibilityChange();
        // 
        /**
         * if it's built for in-App
         * or it's safari
         * also need to listen for beforeunload
         */
        if (this.config.inApp || typeof window.safari === 'object' && window.safari.pushNotification) {
            this.onBeforeUnload();
        }
        // Ensures the queue is run immediately whenever the page
        // is in a state where it might soon be unloaded.
        // https://philipwalton.com/articles/idle-until-urgent/
        this.queue = new idle_queue_1.IdleQueue({ ensureTasksRun: true });
        // Log Navigation Timing
        if (this.config.navigationTiming) {
            this.logNavigationTiming();
        }
    }
    Object.defineProperty(Nemetric.prototype, "navigationTiming", {
        get: function () {
            if (!this.config.navigationTiming) {
                return {};
            }
            return this.perf.navigationTiming;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Start performance measurement
     */
    Nemetric.prototype.start = function (metricName) {
        if (!this.checkMetricName(metricName) || !performance_1.default.supported()) {
            return;
        }
        if (this.metrics[metricName]) {
            this.logWarn('Recording already started.');
            return;
        }
        this.metrics[metricName] = {
            end: 0,
            start: this.perf.now(),
        };
        // Creates a timestamp in the browser's performance entry buffer
        this.perf.mark(metricName, 'start');
        // Reset hidden value
        this.isHidden = false;
    };
    /**
     * End performance measurement
     */
    Nemetric.prototype.end = function (metricName) {
        var _this = this;
        if (!this.checkMetricName(metricName) || !performance_1.default.supported()) {
            return;
        }
        var metric = this.metrics[metricName];
        if (!metric) {
            this.logWarn('Recording already stopped.');
            return;
        }
        // End Performance Mark
        metric.end = this.perf.now();
        this.perf.mark(metricName, 'end');
        // Get duration and change it to a two decimal value
        var duration = this.perf.measure(metricName, metric);
        var duration2Decimal = parseFloat(duration.toFixed(2));
        delete this.metrics[metricName];
        this.pushTask(function () {
            // Log to console, delete metric and send to analytics tracker
            _this.log({ metricName: metricName, duration: duration2Decimal });
            _this.sendTiming({ metricName: metricName, duration: duration2Decimal });
        });
        return duration2Decimal;
    };
    /**
     * End performance measurement after first paint from the beging of it
     */
    Nemetric.prototype.endPaint = function (metricName) {
        var _this = this;
        return new Promise(function (resolve) {
            setTimeout(function () {
                var duration = _this.end(metricName);
                resolve(duration);
            });
        });
    };
    /**
     * Coloring Text in Browser Console
     */
    Nemetric.prototype.log = function (options) {
        var _a = __assign({ suffix: 'ms' }, options), metricName = _a.metricName, data = _a.data, duration = _a.duration, suffix = _a.suffix;
        // Don't log when page is hidden or has disabled logging
        if (this.isHidden || !this.config.logging) {
            return;
        }
        if (!metricName) {
            this.logWarn(this.logMetricWarn);
            return;
        }
        var style = 'color: green;font-size:11px;';
        var text = "%c " + this.config.logPrefix + " " + metricName + " ";
        if (duration) {
            var durationMs = duration.toFixed(2);
            text += durationMs + " " + suffix;
            window.console.log(text, style);
        }
        else if (data) {
            window.console.log(text, style, data);
        }
    };
    /**
     * Coloring Debugging Text in Browser Console
     */
    Nemetric.prototype.logDebug = function (methodName, debugValue) {
        if (debugValue === void 0) { debugValue = ''; }
        if (!this.config.debugging) {
            return;
        }
        window.console.log("Nemetric.js debugging " + methodName + ":", debugValue);
    };
    /**
     * Sends the User timing measure to Analytics System.
     */
    Nemetric.prototype.sendTiming = function (options) {
        var metricName = options.metricName, data = options.data, duration = options.duration;
        // Doesn't send timing when page is hidden
        if (this.isHidden) {
            return;
        }
        // Get Browser from userAgent
        var browser = this.browser;
        // Send metric to custom Analytics service,
        if (this.config.analyticsTracker) {
            //random track
            Math.random() < this.config.sampleRate && this.config.analyticsTracker({ data: data, metricName: metricName, duration: duration, browser: browser });
        }
    };
    Nemetric.prototype.initPerformanceObserver = function () {
        var _this = this;
        // Init observe FCP  and creates the Promise to observe metric
        if (this.config.firstPaint || this.config.firstContentfulPaint) {
            this.observeFirstPaint = new Promise(function (resolve) {
                _this.logDebug('observeFirstPaint');
                _this.observers['firstPaint'] = resolve;
            });
            this.observeFirstContentfulPaint = new Promise(function (resolve) {
                _this.logDebug('observeFirstContentfulPaint');
                _this.observers['firstContentfulPaint'] = resolve;
                _this.initFirstPaint();
            });
        }
        // FID needs to be initialized as soon as Nemetric is available,
        // which returns a Promise that can be observed.
        // DataConsumption resolves after FID is triggered
        this.observeFirstInputDelay = new Promise(function (resolve) {
            _this.observers['firstInputDelay'] = resolve;
            _this.initFirstInputDelay();
        });
        // Collects KB information related to resources on the page
        if (this.config.dataConsumption) {
            this.observeDataConsumption = new Promise(function (resolve) {
                _this.observers['dataConsumption'] = resolve;
                _this.initDataConsumption();
            });
        }
    };
    Nemetric.prototype.checkMetricName = function (metricName) {
        if (metricName) {
            return true;
        }
        this.logWarn(this.logMetricWarn);
        return false;
    };
    /**
     * Logging Performance Paint Timing
     */
    Nemetric.prototype.performanceObserverCb = function (options) {
        var _this = this;
        this.logDebug('performanceObserverCb', options);
        options.entries.forEach(function (performanceEntry) {
            _this.pushTask(function () {
                if (_this.config[options.metricName] &&
                    (!options.entryName ||
                        (options.entryName && performanceEntry.name === options.entryName))) {
                    _this.logMetric(performanceEntry[options.valueLog], options.metricLog, options.metricName);
                }
            });
            if (_this.perfObservers.firstContentfulPaint &&
                performanceEntry.name === 'first-contentful-paint') {
                _this.perfObservers.firstContentfulPaint.disconnect();
            }
        });
        if (this.perfObservers.firstInputDelay &&
            options.metricName === 'firstInputDelay') {
            this.perfObservers.firstInputDelay.disconnect();
        }
    };
    Nemetric.prototype.performanceObserverResourceCb = function (options) {
        var _this = this;
        this.logDebug('performanceObserverResourceCb', options);
        options.entries.forEach(function (performanceEntry) {
            if (performanceEntry.decodedBodySize) {
                var decodedBodySize = parseFloat((performanceEntry.decodedBodySize / 1000).toFixed(2));
                _this.dataConsumption += decodedBodySize;
            }
        });
    };
    Nemetric.prototype.digestFirstPaintEntries = function (entries) {
        this.performanceObserverCb({
            entries: entries,
            entryName: 'first-paint',
            metricLog: 'First Paint',
            metricName: 'firstPaint',
            valueLog: 'startTime',
        });
        this.performanceObserverCb({
            entries: entries,
            entryName: 'first-contentful-paint',
            metricLog: 'First Contentful Paint',
            metricName: 'firstContentfulPaint',
            valueLog: 'startTime',
        });
    };
    /**
     * First Paint is essentially the paint after which
     * the biggest above-the-fold layout change has happened.
     */
    Nemetric.prototype.initFirstPaint = function () {
        this.logDebug('initFirstPaint');
        try {
            this.perfObservers.firstContentfulPaint = this.perf.performanceObserver('paint', this.digestFirstPaintEntries.bind(this));
        }
        catch (e) {
            this.logWarn('initFirstPaint failed');
        }
    };
    Nemetric.prototype.digestFirstInputDelayEntries = function (entries) {
        this.performanceObserverCb({
            entries: entries,
            metricLog: 'First Input Delay',
            metricName: 'firstInputDelay',
            valueLog: 'duration',
        });
        this.disconnectDataConsumption();
    };
    Nemetric.prototype.initFirstInputDelay = function () {
        try {
            this.perfObservers.firstInputDelay = this.perf.performanceObserver('first-input', this.digestFirstInputDelayEntries.bind(this));
        }
        catch (e) {
            this.logWarn('initFirstInputDelay failed');
        }
    };
    Nemetric.prototype.digestDataConsumptionEntries = function (entries) {
        this.performanceObserverResourceCb({
            entries: entries,
        });
    };
    Nemetric.prototype.disconnectDataConsumption = function () {
        clearTimeout(this.dataConsumptionTimeout);
        if (!this.perfObservers.dataConsumption || !this.dataConsumption) {
            return;
        }
        this.logMetric(this.dataConsumption, 'Data Consumption', 'dataConsumption', 'Kb');
        this.perfObservers.dataConsumption.disconnect();
    };
    Nemetric.prototype.initDataConsumption = function () {
        var _this = this;
        try {
            this.perfObservers.dataConsumption = this.perf.performanceObserver('resource', this.digestDataConsumptionEntries.bind(this));
        }
        catch (e) {
            this.logWarn('initDataConsumption failed');
        }
        this.dataConsumptionTimeout = setTimeout(function () {
            _this.disconnectDataConsumption();
        }, 15000);
    };
    /**
     * From visibilitychange listener it saves only when
     * the page gets hidden, because it's important to not
     * use the wrong "hidden" value when send timing or logging.
     */
    Nemetric.prototype.onVisibilityChange = function () {
        if (typeof document.hidden !== 'undefined') {
            // Opera 12.10 and Firefox 18 and later support
            document.addEventListener('visibilitychange', this.didVisibilityChange);
        }
    };
    /**
     * The onbeforeunload property of the WindowEventHandlers mixin is the EventHandler for processing beforeunload events.
     * These events fire when a window is about to unload its resources. At this point,
     * the document is still visible and the event is still cancelable.
     */
    Nemetric.prototype.onBeforeUnload = function () {
        if (typeof document.hidden !== 'undefined') {
            // Opera 12.10 and Firefox 18 and later support
            document.addEventListener('beforeunload', this.didVisibilityChange);
        }
    };
    /**
     * Dispatches the metric duration into internal logs
     * and the external time tracking service.
     */
    Nemetric.prototype.logMetric = function (duration, logText, metricName, suffix) {
        if (suffix === void 0) { suffix = 'ms'; }
        var duration2Decimal = parseFloat(duration.toFixed(2));
        // Stop Analytics and Logging for false negative metrics
        if (metricName !== 'dataConsumption' &&
            duration2Decimal > this.config.maxMeasureTime) {
            return;
        }
        else if (metricName === 'dataConsumption' &&
            duration2Decimal > this.config.maxDataConsumption) {
            return;
        }
        // Save metrics in Duration property
        if (metricName === 'firstPaint') {
            this.firstPaintDuration = duration2Decimal;
        }
        if (metricName === 'firstContentfulPaint') {
            this.firstContentfulPaintDuration = duration2Decimal;
        }
        if (metricName === 'firstInputDelay') {
            this.firstInputDelayDuration = duration2Decimal;
        }
        this.observers[metricName](duration2Decimal);
        // Logs the metric in the internal console.log
        this.log({ metricName: logText, duration: duration2Decimal, suffix: suffix });
        // Sends the metric to an external tracking service
        this.sendTiming({ metricName: metricName, duration: duration2Decimal });
    };
    /**
     * Ensures console.warn exist and logging is enable for
     * warning messages
     */
    Nemetric.prototype.logWarn = function (message) {
        if (!this.config.warning || !this.config.logging) {
            return;
        }
        window.console.warn(this.config.logPrefix, message);
    };
    Nemetric.prototype.logNavigationTiming = function () {
        var metricName = 'NavigationTiming';
        // Logs the metric in the internal console.log
        this.log({ metricName: metricName, data: this.navigationTiming, suffix: '' });
        // Sends the metric to an external tracking service
        this.sendTiming({ metricName: metricName, data: this.navigationTiming });
    };
    Nemetric.prototype.pushTask = function (cb) {
        if (this.queue && this.queue.pushTask) {
            this.queue.pushTask(function () {
                cb();
            });
        }
        else {
            cb();
        }
    };
    return Nemetric;
}());
exports.default = Nemetric;
//# sourceMappingURL=nemetric.js.map