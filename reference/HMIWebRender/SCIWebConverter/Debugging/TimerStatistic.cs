using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SCIWebConverter.Debugging
{
    public class TimerStatistic
    {
        private int occurences = 0;
        private long timeInMillis = 0;

        public int Occurences { get => occurences; set => occurences = value; }
        public long TimeInMillis { get => timeInMillis; set => timeInMillis = value; }

        public TimerStatistic(int occurences, long timeInMillis)
        {
            Occurences = occurences;
            TimeInMillis = timeInMillis;
        }
    }
}
