module.exports = class
{
    constructor(str = null, timeZone = null)
    {
        this._months = [["Jan", "January", 31], ["Feb", "February", 28], ["Mar", "March", 31], ["Apr", "April", 30],
                        ["May", "May", 31], ["Jun", "June", 30], ["Jul", "July", 31], ["Aug", "August", 31],
                        ["Sep", "September", 30], ["Oct", "October", 31], ["Nov", "November", 30], ["Dec", "December", 31]];
        this._days = [["Sun", "Sunday"], ["Mon", "Monday"], ["Tue", "Tuesday"], ["Wed", "Wednesday"], ["Thu", "Thursday"], ["Fri", "Friday"], ["Sat", "Saturday"]];
        this._ordinals = ["st", "nd", "rd", "th"];

        this._module = require(__filename);
        this._isValid = true;

        if ($Utils.empty(str))
        {
            this._date = new Date();
        }
        else
        {
            if (str === parseInt(str))
            {
                this._date = new Date(parseInt(str) * 1000);
            }
            else
            {
                if (str.length == 10)
                {
                    str += " 00:00:00";
                }

                this._date = new Date(str);
                if (isNaN(this._date))
                {
                    $Logger.logString($Const.LL_WARNING, `Invalid date was received: ${str}`);
                    this._isValid = false;
                }
            }
        }

        const newTimeZone = (timeZone == null ? $Const.SYSTEM_TIME_ZONE : timeZone);
        this._timeZone = newTimeZone;
//        this.setTimeZone(newTimeZone);
    }

    clone()
    {
        return new this._module(this._date.toString());
    }

    getMonthStart()
    {
        return this.format("Y-m-01 00:00:00");
    }

    getMonthEnd()
    {
        let d = new this._module(this.getMonthStart());
        d.addMonths(1);
        d.addSeconds(-1);
        return d.format();
    }

    isValid()
    {
        return this._isValid;
    }

    setTimeZone(timeZone)
    {
        if (this._timeZone == timeZone)
        {
            return this;
        }

        let tzDateStr = this._date.toLocaleString("en-US", { timeZone: this._timeZone });
        let tzDate = new Date(tzDateStr);
        let diff = tzDate.getTime() - this._date.getTime();
        this._date = new Date(this._date.getTime() - diff);

        this._timeZone = timeZone;

        tzDateStr = this._date.toLocaleString("en-US", { timeZone: this._timeZone });
        tzDate = new Date(tzDateStr);
        diff = tzDate.getTime() - this._date.getTime();
        this._date = new Date(this._date.getTime() + diff);

        return this;
    }

    getTimeZone()
    {
        return this._timeZone;
    }

    get()
    {
        return this._date;
    }

    getTimestamp(withMs = false)
    {
        return Math.floor(this._date.getTime() / (withMs ? 1 : 1000));
    }

    format(format = null)
    {
        if (format === null)
        {
            format = 'Y-m-d H:i:s';
        }

        // let tzDateStr = this._date.toLocaleString("en-US", { timeZone: this._timeZone });
        // let tzDate = new Date(tzDateStr);
        let tzDate = this._date;
        let year = tzDate.getFullYear();
        let month = tzDate.getMonth() + 1;
        let date = tzDate.getDate();
        let hours = tzDate.getHours();
        let minutes = tzDate.getMinutes();
        let seconds = tzDate.getSeconds();
        let day = tzDate.getDay();
        let ordianl = this._ordinals[date > 3 ? 3 : date - 1];
        let isLeapYear = (year % 4 == 0 ? (year % 100 == 0 ? (year % 400 == 0 ? 1 : 0) : 1) : 0);
        let hours12 = (hours == 0 ? 12 : (hours > 12 ? hours - 12 : hours));

        let dateStr = format.replace(/Y/g, "#Y#")
                            .replace(/y/g, "#y#")
                            .replace(/m/g, "#m#")
                            .replace(/n/g, "#n#")
                            .replace(/F/g, "#F#")
                            .replace(/M/g, "#M#")
                            .replace(/t/g, "#t#")
                            .replace(/L/g, "#L#")
                            .replace(/d/g, "#d#")
                            .replace(/j/g, "#j#")
                            .replace(/H/g, "#H#")
                            .replace(/G/g, "#G#")
                            .replace(/h/g, "#h#")
                            .replace(/g/g, "#g#")
                            .replace(/i/g, "#i#")
                            .replace(/s/g, "#s#")
                            .replace(/a/g, "#a#")
                            .replace(/A/g, "#A#")
                            .replace(/D/g, "#D#")
                            .replace(/l/g, "#l#")
                            .replace(/S/g, "#S#")
                            .replace(/w/g, "#w#")
                            .replace(/e/g, "#e#")
                            .replace(/z/g, "#z#")

                            .replace(/#Y#/g, year)
                            .replace(/#y#/g, ("" + year).slice(-2))
                            .replace(/#m#/g, ("0" + month).slice(-2))
                            .replace(/#n#/g, month)
                            .replace(/#F#/g, this._months[month - 1][1])
                            .replace(/#M#/g, this._months[month - 1][0])
                            .replace(/#t#/g, this._months[month - 1][2] + isLeapYear)
                            .replace(/#L#/g, isLeapYear)
                            .replace(/#d#/g, ("0" + date).slice(-2))
                            .replace(/#j#/g, date)
                            .replace(/#H#/g, ("0" + hours).slice(-2))
                            .replace(/#G#/g, hours)
                            .replace(/#h#/g, ("0" + hours12).slice(-2))
                            .replace(/#g#/g, hours12)
                            .replace(/#i#/g, ("0" + minutes).slice(-2))
                            .replace(/#s#/g, ("0" + seconds).slice(-2))
                            .replace(/#a#/g, (hours < 12 ? "am" : "pm"))
                            .replace(/#A#/g, (hours < 12 ? "AM" : "PM"))
                            .replace(/#D#/g, this._days[day][0])
                            .replace(/#l#/g, this._days[day][1])
                            .replace(/#S#/g, ordianl)
                            .replace(/#w#/g, day)
                            .replace(/#e#/g, this._timeZone)
                            .replace(/#z#/g, (this._date.getTime() % 1000).toString().padStart(3, '0'));

        return dateStr;
    }

    setTime(time)
    {
        let str = this.format('Y-m-d ' + time);
        this._date = new Date(str);
        return this;
    }

    resetSeconds()
    {
        let str = this.format('Y-m-d H:i:00');
        this._date = new Date(str);
        return this;
    }

    resetMinutes()
    {
        let str = this.format('Y-m-d H:00:00');
        this._date = new Date(str);
        return this;
    }

    resetHours()
    {
        let str = this.format('Y-m-d 00:00:00');
        this._date = new Date(str);
        return this;
    }
    
    setTimeOfDay(time)
    {
        if ($Utils.empty(time))
        {
            return this;
        }

        let parts = time.split(":");
        let hour = parts[0];
        let minute = ($Utils.isset(parts[1]) ? parts[1] : this._date.getMinutes());
        let second = ($Utils.isset(parts[2]) ? parts[2] : this._date.getSeconds());

        let str = this.format('Y-m-d ') + $Utils.strFormat("{0}:{1}:{2}", ("0" + hour).slice(-2), ("0" + minute).slice(-2), ("0" + second).slice(-2));
        this._date = new Date(str);
        return this;
    }

    addSeconds(secs)
    {
        this._date = new Date(this._date.setSeconds(this._date.getSeconds() + secs));
        return this;
    }

    addMinutes(mins)
    {
        this._date = new Date(this._date.setMinutes(this._date.getMinutes() + mins));
        return this;
    }

    addHours(hours)
    {
        this._date = new Date(this._date.setHours(this._date.getHours() + hours));
        return this;
    }

    addDays(days)
    {
        this._date = new Date(this._date.setDate(this._date.getDate() + days));
        return this;
    }

    addMonths(mons, keepEndMonth = false)
    {
        let origDay = this._date.getDate();
        this._date = new Date(this._date.setMonth(this._date.getMonth() + mons));

        let newDay = this._date.getDate();

        if (keepEndMonth && origDay != newDay)
        {
            while (newDay <= 3)
            {
                this.addDays(-1);
                newDay = this._date.getDate();
            }
        }

        return this;
    }

    addYears(years)
    {
        this._date = new Date(this._date.setFullYear(this._date.getFullYear() + years));
        return this;
    }

    diff(toDate)
    {
        return Math.floor((toDate._date.getTime() - this._date.getTime()) / 1000);
    }

    getTimeAgo()
    {
        let secs = this.diff(new $Date());
        if (secs == 0)
        {
            return "Just now";
        }

        let tense = (secs < 0 ? "from now" : "ago");
        secs = Math.abs(secs);

        if (secs == 1) return `1 second ${tense}`;
        if (secs < 60) return `${secs} seconds ${tense}`;

        let mins = Math.floor(secs / 60);
        if (mins == 1) return `1 minute ${tense}`;
        if (mins < 60) return `${mins} minutes ${tense}`;

        let hours = Math.floor(secs / 3600);
        if (hours == 1) return `1 hour ${tense}`;
        if (hours < 24) return `${hours} hours ${tense}`;

        let days = Math.floor(secs / 86400);
        if (days == 1) return `1 day ${tense}`;
        if (days < 7) return `${days} days ${tense}`;

        let weeks = Math.floor(secs / 604800);
        if (weeks == 1) return `1 week ${tense}`;
        if (secs < 2592000 /* 30 days */) return `${weeks} weeks ${tense}`;

        let months = Math.floor(secs / 2592000);
        if (months == 1) return `1 month ${tense}`;
        if (months < 12) return `${months} months ${tense}`;

        let years = Math.floor(secs / 31536000);
        if (years < 2) return `1 year ${tense}`;
        return `${years} years ${tense}`;
    }

    getAge()
    {
        const today = new Date();

        let age = today.getFullYear() - this._date.getFullYear();
        const monthDiff = today.getMonth() - this._date.getMonth();
        const dayDiff = today.getDate() - this._date.getDate();

        // If birthday hasn’t occurred yet this year, subtract 1
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0))
        {
            age--;
        }

        return age;
    }

    // public static function getTimeZoneDiff($fromTZ, $toTZ)
    // {
    //     $dateFrom = new Date(null, $fromTZ);
    //     $dateToTz = new Date(null, $toTZ);
    //     $dateTo = new Date($dateToTz->format(), $fromTZ);
    //     return round($dateFrom->diff($dateTo) / 3600, 1);
    // }
};
