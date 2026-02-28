using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SCIWebConverter.Debugging
{
    public static class Logger
    {

        public static StringBuilder LogString = new StringBuilder();
        public static StringBuilder LiveLog = new StringBuilder();

        public static void Out(string str)
        {
            //Dispatcher.CurrentDispatcher.Invoke(() => Console.WriteLine(str));
            Console.WriteLine(str);
            LogString.Append(str).Append(Environment.NewLine);
            LiveLog.Append(str).Append(Environment.NewLine);
        }

        public static void Out(Exception e)
        {
            Out(e.Message);
            Out(e.StackTrace);
            Out(e.ToString());
        }
    }
}
