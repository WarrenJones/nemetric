"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Performance = /** @class */ (function () {
    function Performance() {
        this.navigationTimingCached = {};
    }
    /**
     * True if the browser supports the Navigation Timing API,
     * User Timing API and the PerformanceObserver Interface.
     * In Safari, the User Timing API (performance.mark()) is not available,
     * so the DevTools timeline will not be annotated with marks.
     * Support: developer.mozilla.org/en-US/docs/Web/API/Performance/mark
     * Support: developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver
     * Support: developer.mozilla.org/en-US/docs/Web/API/Performance/getEntriesByType
     */
    Performance.supported = function () {
        return (window.performance &&
            !!performance.getEntriesByType &&
            !!performance.now &&
            !!performance.mark);
    };
    /**
     * For now only Chrome fully support the PerformanceObserver interface
     * and the entryType "paint".
     * Firefox 58: https://bugzilla.mozilla.org/show_bug.cgi?id=1403027
     */
    Performance.supportedPerformanceObserver = function () {
        return window.chrome && 'PerformanceObserver' in window;
    };
    Object.defineProperty(Performance.prototype, "navigationTiming", {
        /**
         * Navigation Timing API provides performance metrics for HTML documents.
         * w3c.github.io/navigation-timing/
         * developers.google.com/web/fundamentals/performance/navigation-and-resource-timing
         */
        get: function () {
            if (!Performance.supported() ||
                Object.keys(this.navigationTimingCached).length) {
                return this.navigationTimingCached;
            }
            // There is an open issue to type correctly getEntriesByType
            // github.com/microsoft/TypeScript/issues/33866
            var navigation = performance.getEntriesByType('navigation')[0];
            // In Safari version 11.2 Navigation Timing isn't supported yet
            if (!navigation) {
                return this.navigationTimingCached;
            }
            // We cache the navigation time for future times
            this.navigationTimingCached = {
                // fetchStart marks when the browser starts to fetch a resource
                // responseEnd is when the last byte of the response arrives
                fetchTime: parseFloat((navigation.responseEnd - navigation.fetchStart).toFixed(2)),
                // Service worker time plus response time
                workerTime: parseFloat((navigation.workerStart > 0 ? navigation.responseEnd - navigation.workerStart : 0).toFixed(2)),
                // Request plus response time (network only)
                totalTime: parseFloat((navigation.responseEnd - navigation.requestStart).toFixed(2)),
                // Response time only (download)
                downloadTime: parseFloat((navigation.responseEnd - navigation.responseStart).toFixed(2)),
                // Time to First Byte (TTFB)
                timeToFirstByte: parseFloat((navigation.responseStart - navigation.requestStart).toFixed(2)),
                // HTTP header size
                headerSize: parseFloat((navigation.transferSize - navigation.encodedBodySize).toFixed(2)),
                // Measuring DNS lookup time
                dnsLookupTime: parseFloat((navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2)),
            };
            return this.navigationTimingCached;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * When performance API available
     * returns a DOMHighResTimeStamp, measured in milliseconds, accurate to five
     * thousandths of a millisecond (5 microseconds).
     */
    Performance.prototype.now = function () {
        return window.performance.now();
    };
    Performance.prototype.mark = function (metricName, type) {
        var mark = "mark_" + metricName + "_" + type;
        window.performance.mark(mark);
    };
    Performance.prototype.measure = function (metricName, metric) {
        var startMark = "mark_" + metricName + "_start";
        var endMark = "mark_" + metricName + "_end";
        window.performance.measure(metricName, startMark, endMark);
        return this.getDurationByMetric(metricName, metric);
    };
    /**
     * PerformanceObserver subscribes to performance events as they happen
     * and respond to them asynchronously.
     */
    Performance.prototype.performanceObserver = function (eventType, cb) {
        this.perfObserver = new PerformanceObserver(this.performanceObserverCb.bind(this, cb));
        // Retrieve buffered events and subscribe to newer events for Paint Timing
        this.perfObserver.observe({ type: eventType, buffered: true });
        return this.perfObserver;
    };
    /**
     * Get the duration of the timing metric or -1 if there a measurement has
     * not been made by the User Timing API
     */
    Performance.prototype.getDurationByMetric = function (metricName, metric) {
        var entry = this.getMeasurementForGivenName(metricName);
        if (entry && entry.entryType === 'measure') {
            return entry.duration;
        }
        return -1;
    };
    /**
     * Return the last PerformanceEntry objects for the given name.
     */
    Performance.prototype.getMeasurementForGivenName = function (metricName) {
        var entries = window.performance.getEntriesByName(metricName);
        return entries[entries.length - 1];
    };
    Performance.prototype.performanceObserverCb = function (cb, entryList) {
        var entries = entryList.getEntries();
        cb(entries);
    };
    return Performance;
}());
exports.default = Performance;
//# sourceMappingURL=performance.js.map