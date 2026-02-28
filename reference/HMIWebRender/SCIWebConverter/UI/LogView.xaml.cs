using SCIWebConverter.Debugging;
using System;
using System.Threading;
using System.Timers;
using System.Windows.Controls;

namespace SCIWebConverter.UI
{
    /// <summary>
    /// Interaction logic for LogView.xaml
    /// </summary>
    public partial class LogView : UserControl
    {
        private System.Timers.Timer timer;
        private bool loopActive = false;
        private int indexOfLog = 0;

        public LogView()
        {
            InitializeComponent();

            timer = new System.Timers.Timer();
            timer.Interval = .5 * 1000; // In seconds
            timer.Elapsed += new ElapsedEventHandler(this.OnTimer);
            timer.AutoReset = true;
            timer.Start();
        }

        public string Text { get => logTextBox.Text; set => logTextBox.Text = value; }

        public TextBox GetTextBox()
        {
            return logTextBox;
        }

        public void OnTimer(object sender, ElapsedEventArgs args)
        {
            if (!loopActive)
            {
                loopActive = true;
                try
                {
                    Action action = delegate
                    {
                        try
                        {
                            string val = Logger.LiveLog.ToString();
                            Logger.LiveLog.Clear();
                            if (val.Length > 1499)
                                val = val.Substring(val.Length - 1500);
                            if (val.Length > 0)
                            {
                                if (Text.Length > 1500)
                                    Text = val;
                                else
                                    logTextBox.AppendText(val);
                                logTextBox.ScrollToEnd();
                                //Logger.LiveLog.Remove(0, val.Length);
                            }
                            indexOfLog += val.Length;
                        }
                        catch (ArgumentOutOfRangeException ex)
                        {
                            Logger.Out("[IGNORE] Out of Range Exception thrown on LiveLog due to multithreading.");
                        }
                    };

                    if (logTextBox.Dispatcher.Thread == Thread.CurrentThread)
                    {
                        logTextBox.Dispatcher.BeginInvoke(action);
                    }
                    else
                    {
                        this.Dispatcher.Invoke(action);
                    }
                }
                catch (Exception e)
                {
                    Logger.Out($"Exception thrown.\n{e.Message}\n{e.StackTrace}");
                }
                loopActive = false;
            }
        }

        public void Dispose()
        {
            timer.Elapsed -= OnTimer;
            timer.AutoReset = false;
            Text = "";
        }
    }
}
