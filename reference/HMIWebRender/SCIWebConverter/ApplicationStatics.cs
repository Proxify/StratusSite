using SCIWebConverter.Debugging;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SCIWebConverter
{
    public static class ApplicationStatics
    {
        public static string graphicPath = "";
        public static string savePath = "";

        public static ConcurrentDictionary<string, string> tagConversionMap = new ConcurrentDictionary<string, string>();

        public static ConcurrentDictionary<string, TimerStatistic> timerStats = new ConcurrentDictionary<string, TimerStatistic>();

        public static ImmutableList<string> shapeNameIgnoreList = ImmutableList.Create<string>(
            "WdgRedTag",
            "ConAlarmState",
            "LinExecState",
            "LineExecState",
            "TxtError",
            "TxtBad",
            "ScTxtSelectBox",
            "FrameDynamic",
            "GSH"
            //"ConAlpMode"
        );

        public static float imageScale = 3.0f;
    }
}
