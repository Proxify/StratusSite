using SCIWebConverter.Conversion;
using SCIWebConverter.Conversion.Raddical;
using SCIWebConverter.Debugging;
using SCIWebConverter.Resources;
using SCIWebConverter.Security;
using SCIWebConverter.UI;
using Microsoft.WindowsAPICodePack.Dialogs;
using ScallonAuth;
using ScallonAuth.enums;
using ScallonAuth.Interfaces;
using ScallonUI;
using ScallonUI.Controls.Auth;
using ScallonUI.Extensions;
using SSExport;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.NetworkInformation;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using SCIWebConverter;
using SCIWebConverter.SCIWeb;

namespace SCIWebConverter
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window, ILicensable
    {
        private LoadingControl loadingControl;
        private LicenseRegistrationControl licenseRegistrationControl;
        private LogView logView = null;

        private List<Task> tasks = new List<Task>();
        private ConversionType conversionType = ConversionType.RENDER;

        private Settings settings = new Settings();

        private PBObjLib.Application pbApplication;
        private RaddicalConvert raddicalConvert;
        private Stopwatch stopwatch = new Stopwatch();
        private string graphicFolder = "";
        private List<HMIWebGraphic> hmiGraphicList = new List<HMIWebGraphic>(); // Used in conversion to ProcessBook

        private List<string> highlightedIssues = new List<string>();

        public MainWindow()
        {
            InitializeComponent();
        }

        private void ExecuteButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                ShowLoadingScreen(true);

                if (settings != null)
                {
                    settings.GraphicsPath = graphicPathTextBox.Text;
                    settings.SavePath = savePathTextBox.Text;
                    settings.PiServerName = piServerNameTextBox.Text;
                    settings.RaddicalNetworkPath = raddicalPathTextBox.Text;
                    settings.RaddicalSerializerPath = radSerializerPathTextBox.Text;
                    settings.ConversionMapPath = conversionMapPathTextBox.Text;
                    settings.Conversion = (ConversionType)conversionTypeComboBox.SelectedIndex;
                    settings.MultiThreaded = multiThreadedCheckBox.IsChecked == true;
                    settings.Save();
                }



                string domain = Encryption.EncryptString(IPGlobalProperties.GetIPGlobalProperties().DomainName);

                //Console.WriteLine(Encryption.EncryptString("parpcn.local"));

                if (!ApplicationInfo.Domain1.Equals(domain) && !ApplicationInfo.Domain2.Equals(domain) && !ApplicationInfo.Domain3.Equals(domain) && !Environment.MachineName.ToUpper().StartsWith("SUDO"))
                //if(!Environment.MachineName.ToUpper().StartsWith("SUDO"))
                //if(false)
                {
                    MessageBox.Show("Application unlicensed for this machine.");
                    Logger.Out(Encryption.ASCIIShift(IPGlobalProperties.GetIPGlobalProperties().DomainName, 5));
                    // Write out log file
                    using (System.IO.StreamWriter file = new System.IO.StreamWriter(settings.SavePath + "\\info.info"))
                    {
                        file.WriteLine(Logger.LogString.ToString());
                    }
                    ShowCompletePrompt();
                    return;
                }


                conversionType = (ConversionType)conversionTypeComboBox.SelectedIndex;

                if (conversionType == ConversionType.RADDICAL)
                {
                    raddicalConvert = new RaddicalConvert(piServerNameTextBox.Text, raddicalPathTextBox.Text);
                    ApplicationStatics.imageScale = 1.0f;
                }

                if (!string.IsNullOrEmpty(settings.ConversionMapPath))
                {
                    string[] lines = File.ReadAllLines(settings.ConversionMapPath);

                    try
                    {
                        foreach (string line in lines)
                        {
                            string[] split = line.Split('\t');
                            if (!ApplicationStatics.tagConversionMap.ContainsKey(split[0]))
                                ApplicationStatics.tagConversionMap.TryAdd(split[0], split[1]);
                        }
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show("Exception occured while handling Conversion Map.");
                        Logger.Out("Exception occurred handling the Conversion Map.");
                        Logger.Out(ex);
                        ShowCompletePrompt();
                        return;
                    }
                }

                graphicFolder = graphicPathTextBox.Text + "\\";
                ApplicationStatics.graphicPath = graphicPathTextBox.Text;
                ApplicationStatics.savePath = savePathTextBox.Text + "\\";

                stopwatch.Reset();
                stopwatch.Start();

                if (!settings.MultiThreaded && conversionType == ConversionType.PROCESS_BOOK)
                    pbApplication = new PBObjLib.Application();

                DirectoryInfo d = new DirectoryInfo(graphicFolder);

                var files = d.GetFiles("*.htm");
                if (settings.MultiThreaded)
                {
                    foreach (var file in files)
                    {
                        tasks.Add(Task.Run(() =>
                        {
                            try
                            {
                                HMIWebGraphic graphic = new HMIWebGraphic(file.FullName, ApplicationStatics.savePath, conversionType);
                                graphic.Render(null);

                                if (conversionType == ConversionType.PROCESS_BOOK)
                                    hmiGraphicList.Add(graphic);
                                else if (conversionType == ConversionType.RADDICAL)
                                    raddicalConvert.AddDisplay(new RaddicalDisplay(Path.GetFileNameWithoutExtension(file.Name), ApplicationStatics.savePath + Path.GetFileNameWithoutExtension(file.Name) + ".jpg", graphic.Width, graphic.Height, graphic.PointTags, graphic.NavigationLinks));
                            }
                            catch (Exception ex)
                            {
                                highlightedIssues.Add($"Exception while converting {file.FullName}");
                                Logger.Out($"Exception while converting {file.FullName}");
                                Logger.Out(ex);
                            }
                        }).ContinueWith(c =>
                        {

                        }, TaskScheduler.FromCurrentSynchronizationContext()));

                    }
                }
                else
                {
                    tasks.Add(Task.Run(() =>
                    {
                        foreach (var file in files)
                        {
                            try
                            {
                                HMIWebGraphic graphic = new HMIWebGraphic(file.FullName, ApplicationStatics.savePath, conversionType);
                                graphic.Render(null);

                                if (conversionType == ConversionType.PROCESS_BOOK)
                                    graphic.SerializeToProcessBookDisplay(pbApplication);
                                else if (conversionType == ConversionType.RADDICAL)
                                    raddicalConvert.AddDisplay(new RaddicalDisplay(Path.GetFileNameWithoutExtension(file.Name), ApplicationStatics.savePath + Path.GetFileNameWithoutExtension(file.Name) + ".jpg", graphic.Width, graphic.Height, graphic.PointTags, graphic.NavigationLinks));

                            }
                            catch (Exception ex)
                            {
                                highlightedIssues.Add($"Exception while converting {file.FullName}");
                                Logger.Out($"Exception while converting {file.FullName}");
                                Logger.Out(ex);
                            }
                        }
                    }));
                }

                Export export = new Export();
                Task[] taskArray = tasks.ToArray();
                if (settings.MultiThreaded)
                {
                    Task.WhenAll(taskArray).ContinueWith(t =>
                    {
                        Task.Run(() =>
                        {
                            if (conversionType == ConversionType.PROCESS_BOOK)
                            {
                            //int convertedCount = 0;
                            pbApplication = new PBObjLib.Application();
                                foreach (var graphic in hmiGraphicList)
                                {
                                    Logger.Out($"Converting {graphic.Id} to PDI.");
                                    Logger.Out($"Last known error: {pbApplication.LastErrorMessage}");
                                    graphic.SerializeToProcessBookDisplay(pbApplication);
                                //convertedCount++;
                            }
                            }
                        }).ContinueWith(con =>
                        {
                            export.ToPDF(ApplicationStatics.savePath, 1, "*.jpg");
                            ShowCompletePrompt();
                        }, TaskScheduler.FromCurrentSynchronizationContext());
                    }, TaskScheduler.FromCurrentSynchronizationContext());
                }
                else
                {
                    Task.WhenAll(taskArray).ContinueWith(t =>
                    {
                        Task.Run(() =>
                        {
                            export.ToPDF(ApplicationStatics.savePath, 1, "*.jpg");
                            Dispatcher.Invoke(() =>
                            {
                                ShowCompletePrompt();
                            });
                        });
                    });
                }
            }
            catch(Exception exception)
            {
                Logger.Out(exception);

                // Write out log file
                using (System.IO.StreamWriter file = new System.IO.StreamWriter(settings.SavePath + "\\info.info"))
                {
                    file.WriteLine(Logger.LogString.ToString());
                }
            }
        }

        private void ShowCompletePrompt()
        {
            if (conversionType == ConversionType.PROCESS_BOOK)
            {
                pbApplication.Quit();

                // Delete all _tiles folders
                //string[] folders = Directory.GetDirectories(ApplicationStatics.savePath);
                //foreach(var folder in folders)
                //{
                //    if(folder.IndexOf("_tiles") >= 0)
                //    {
                //        Logger.Out("Deleting folder: " + folder);
                //        Directory.Delete(folder);
                //    }
                //}
            }
            else if (conversionType == ConversionType.RADDICAL)
            {
                RaddicalConvert.SerializeRad(settings.RaddicalSerializerPath, raddicalConvert);

                StringBuilder sb = new StringBuilder();
                sb.Append("Graphic Title,Tagname\n");

                raddicalConvert.Displays.ForEach(d =>
                {
                    d.PointTagList.ForEach(p =>
                    {
                        sb.Append($"{d.GraphicTitle},{p.Tagname}\n");
                    });
                });
                //using (System.IO.StreamWriter file = new System.IO.StreamWriter(ApplicationStatics.savePath + "AssocDsp.csv"))
                //{
                //    file.WriteLine(sb.ToString());
                //}
            }

            stopwatch.Stop();

            TimeSpan ts = stopwatch.Elapsed;
            string elapsedTime = String.Format("{0:00} Min(s) {1:00} sec(s) {2:00}ms",
                ts.Minutes, ts.Seconds,
                ts.Milliseconds);
            stopwatch.Reset();
            Logger.LogString.Clear();

            // Before closing out log file, output known issues.
            highlightedIssues.ForEach(i => Logger.Out(i));

            // Write out log file
            using (System.IO.StreamWriter file = new System.IO.StreamWriter(ApplicationStatics.savePath + "log.info"))
            {
                file.WriteLine(Logger.LogString.ToString());
            }

            ShowLoadingScreen(false);

            MessageBox.Show("Conversion complete. (" + elapsedTime + ")");
        }

        private void graphicPathButton_Click(object sender, RoutedEventArgs e)
        {
            CommonOpenFileDialog dialog = new CommonOpenFileDialog();
            dialog.IsFolderPicker = true;
            dialog.Multiselect = false;
            if (dialog.ShowDialog() == CommonFileDialogResult.Ok)
            {
                graphicPathTextBox.Text = dialog.FileName;
            }
        }

        private void savePathButton_Click(object sender, RoutedEventArgs e)
        {
            CommonOpenFileDialog dialog = new CommonOpenFileDialog();
            dialog.IsFolderPicker = true;
            dialog.Multiselect = false;
            if (dialog.ShowDialog() == CommonFileDialogResult.Ok)
            {
                savePathTextBox.Text = dialog.FileName;
            }
        }

        private void conversionMapPathButton_Click(object sender, RoutedEventArgs e)
        {
            CommonOpenFileDialog dialog = new CommonOpenFileDialog();
            dialog.IsFolderPicker = false;
            dialog.Multiselect = false;
            if (dialog.ShowDialog() == CommonFileDialogResult.Ok)
            {
                conversionMapPathTextBox.Text = dialog.FileName;
            }
        }
        private void RadSerializerPathButton_Click(object sender, RoutedEventArgs e)
        {
            CommonOpenFileDialog dialog = new CommonOpenFileDialog();
            dialog.IsFolderPicker = false;
            dialog.Multiselect = false;
            dialog.Filters.Add(new CommonFileDialogFilter("Exe File", ".exe"));
            if (dialog.ShowDialog() == CommonFileDialogResult.Ok)
            {
                radSerializerPathTextBox.Text = dialog.FileName;
            }
        }

        private void ExecuteButton_Loaded(object sender, RoutedEventArgs e)
        {
            versionLabel.Content = ApplicationResources.Version;

            AuthenticateLicense();

            loadingControl = new LoadingControl()
            {
                HorizontalAlignment = HorizontalAlignment.Stretch,
                VerticalAlignment = VerticalAlignment.Stretch,
                Opacity = 0
            };

            Settings temp = Settings.Load();
            if (temp != null)
            {
                settings = temp;
                graphicPathTextBox.Text = settings.GraphicsPath;
                savePathTextBox.Text = settings.SavePath;
                raddicalPathTextBox.Text = settings.RaddicalNetworkPath;
                piServerNameTextBox.Text = settings.PiServerName;
                radSerializerPathTextBox.Text = settings.RaddicalSerializerPath;
                conversionMapPathTextBox.Text = settings.ConversionMapPath;
                conversionTypeComboBox.SelectedIndex = (int)settings.Conversion;
                multiThreadedCheckBox.IsChecked = settings.MultiThreaded;
            }

            if (((ComboBoxItem)conversionTypeComboBox.SelectedItem).Content.Equals("Render"))
            {
                raddicalPathTextBox.IsEnabled = false;
                piServerNameTextBox.IsEnabled = false;
            }
        }

        public void ShowLoadingScreen(bool value)
        {
            if (value && loadingControl.Opacity <= 0)
            {
                appGrid.Children.Add(loadingControl);
                Animations.FadeIn(loadingControl);
            }
            else
            {
                Animations.FadeOutAndRemove(loadingControl, 0, 1);
                // grid.Children.Remove(loadingControl);
            }
        }

        private void conversionTypeComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (raddicalPathTextBox != null && piServerNameTextBox != null)
            {
                switch (((ComboBoxItem)conversionTypeComboBox.SelectedItem).Content)
                {
                    case "Render":
                    case "ProcessBook":
                        raddicalPathTextBox.IsEnabled = false;
                        piServerNameTextBox.IsEnabled = false;
                        radSerializerPathTextBox.IsEnabled = false;
                        break;
                    case "Raddical":
                        raddicalPathTextBox.IsEnabled = true;
                        piServerNameTextBox.IsEnabled = true;
                        radSerializerPathTextBox.IsEnabled = true;
                        break;
                }
            }
        }

        private void viewLogButton_Click(object sender, RoutedEventArgs e)
        {
            if (logView == null)
            {
                this.Width += 400;
                logView = new LogView()
                {
                    Margin = new Thickness(10, 0, 0, 0)
                };
                Grid.SetColumn(logView, 1);

                appGrid.Children.Add(logView);
                viewLogButton.Content = " < ";
            }
            else
            {
                appGrid.Children.Remove(logView);
                this.Width -= 400;
                logView.Dispose();
                logView = null;
                viewLogButton.Content = " > ";
            }
        }
        //private void ClearDisplay()
        //{
        //    if (contentGrid.Children.Count > 0)
        //    {
        //        for (int i = contentGrid.Children.Count - 1; i >= 0; i--)
        //        {
        //            Animations.FadeOutAndMoveAndRemove((Control)contentGrid.Children[i], 0, new Thickness(0, -20, 0, 20));
        //        }
        //    }
        //}

        public void AuthenticateLicense()
        {
            var status = Authenticate.CheckLicense(AppName.SCI_WEB_RENDER);

            if (status.GetStatusType() == Authenticate.StatusType.VALID)
            {
                DisplayLicenseValid();
            }
            else
            {
                MessageBox.Show(status.GetMessage());
                DisplayLicenseRegistration();
            }
        }

        public void DisplayLicenseRegistration()
        {
            if (!contentGrid.HasChildrenOfType<LicenseRegistrationControl>())
            {
                Animations.FadeOut(appGrid);
                appGrid.IsEnabled = false;

                licenseRegistrationControl = new LicenseRegistrationControl(this)
                {
                    Opacity = 0,
                    Margin = new Thickness(0, 20, 0, 0)
                };
                contentGrid.Children.Add(licenseRegistrationControl);
                Animations.FadeInAndMove(licenseRegistrationControl, 0.20, 0.20, 1);
            }
        }

        public void DisplayLicenseValid()
        {
            if (licenseRegistrationControl != null && contentGrid.Children.Contains(licenseRegistrationControl))
            {
                Animations.FadeOutAndMoveAndRemove(licenseRegistrationControl, 0, new Thickness(0, -20, 0, 20));
            }

            appGrid.IsEnabled = true;
            appGrid.Margin = new Thickness(0, 20, 0, 0);

            Animations.FadeInAndMove(appGrid, 0, 0.2, 1);
        }
    }
}
