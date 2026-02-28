using SCIWebConverter.Conversion;
using Newtonsoft.Json;
using System;
using System.IO;
using SCIWebConverter.Debugging;
using System.Windows;

namespace SCIWebConverter
{
    class Settings
    {
        private static string settingsDirectory = $"{Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData)}\\Scallon Controls\\SCIWebConverter";
        private static string settingsPath = settingsDirectory + "\\settings.json";

        [JsonProperty]
        public string GraphicsPath, SavePath, PiServerName, RaddicalNetworkPath, ConversionMapPath, RaddicalSerializerPath;

        [JsonProperty]
        public bool MultiThreaded = true;

        [JsonProperty]
        public ConversionType Conversion = ConversionType.RENDER;

        public void Save()
        {
            if (!Directory.Exists(settingsDirectory))
            {
                Directory.CreateDirectory(settingsDirectory);
            }

            using (System.IO.StreamWriter file = new System.IO.StreamWriter(settingsPath))
            {
                try
                {
                    file.Write(Newtonsoft.Json.JsonConvert.SerializeObject(this, Formatting.Indented));
                }
                catch (UnauthorizedAccessException ex)
                {
                    Logger.Out(ex);
                    MessageBox.Show("User does not have permission to access the program's installation folder to save application settings.\n\n" +
                        "Please contact your administrator to grant access.");
                }
            }
        }

        public static Settings Load()
        {
            if (File.Exists(settingsPath))
                return JsonConvert.DeserializeObject<Settings>(File.ReadAllText(settingsPath));
            else
                return null;
        }
    }
}
