import Configurable from '../base/configurable';
import { getFormatTime } from '../utils';
import wxp from 'wxp';

export default class Logger extends Configurable {
    _cache: any[] = [];

    push(msg) {
        this._cache.push(msg);
        this.report();
    }

    report() {
        if (!this.config('reportDomain')) {
            console.warn('Logger上报url未设置, 请使用app.logger.config("url", "地址")设置');
            return;
        }
        const cache = this._cache;
        this._cache = [];
        wxp
            .request({
                method: 'POST',
                url: this.config('reportDomain'),
                header: {
                    'content-type': 'application/x-www-form-urlencoded'
                },
                data: `c=${encodeURIComponent(JSON.stringify(cache))}`
            })
            .catch(() => {
                // 上报失败，归还消息
                this._cache = new Array(0).concat(this._cache, cache);
            });
    }

    _log(type, ...args) {
        const sysInfo = getApp().getSystemInfo();
        if (sysInfo.platform === 'devtools') {
            console.log(`[${getFormatTime()} ${String.prototype.toUpperCase.call(type)}]`, ...args);
        } else {
            if (args.length < 1) {
                return;
            }
            const msg = args
                .filter(arg => arg !== undefined)
                .reduce((previous, current) => {
                    return previous.concat(
                        typeof current === 'string' ? [current] : [JSON.stringify(current)]
                    );
                }, [])
                .join(' ');
            if (msg.length > 2048) {
                console.warn('Log不建议传输多于2048字节的信息');
            }

            const app = getApp();

            this.push({
                project: app.pkgName || app.name,
                pageUrl: `${app.pkgName || app.name}:${app.getPage().route || 'app'}`,
                category: 'jsError',
                timestamp: +new Date(),
                level: type,
                content: msg
            });
        }
    }

    log(...args) {
        return this._log('log', ...args);
    }

    error(...args) {
        return this._log('error', ...args);
    }

    warn(...args) {
        return this._log('warn', ...args);
    }

    info(...args) {
        return this._log('info', ...args);
    }
}
