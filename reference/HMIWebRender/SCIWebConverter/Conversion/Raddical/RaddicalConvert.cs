using SCIWebConverter.Debugging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace SCIWebConverter.Conversion.Raddical
{
    [JsonObject]
    public class RaddicalConvert
    {
        [JsonProperty]
        public static string historianServerName, raddicalNetworkPath;

        [JsonProperty]
        private List<RaddicalDisplay> displays = new List<RaddicalDisplay>();

        [JsonIgnore]
        public List<RaddicalDisplay> Displays { get => displays; }

        public RaddicalConvert(string historianServerName, string raddicalNetworkPath)
        {
            RaddicalConvert.historianServerName = historianServerName;
            RaddicalConvert.raddicalNetworkPath = raddicalNetworkPath;
        }

        public static void SerializeJson(RaddicalConvert raddicalConvert)
        {
            string json = JsonConvert.SerializeObject(raddicalConvert);
            json = JValue.Parse(json).ToString(Formatting.Indented);

            File.WriteAllText(ApplicationStatics.savePath + "Raddical.JSON", json);
        }

        public static void SerializeRad(string serializerPath, RaddicalConvert raddicalConvert)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append($"[OUTPUT_FOLDER]{ApplicationStatics.savePath}\n");

            int raddicalFiles = raddicalConvert.displays.Count - 1;
            int curFileIteration = 1;
            for (int i = 0; i < raddicalConvert.displays.Count; i++)
            {

                sb.Append($"[DISP_NAME]{raddicalConvert.displays[i].GraphicTitle}\n");
                sb.Append($"[DEST_FOLDER]{RaddicalConvert.raddicalNetworkPath}\n");
                sb.Append($"[JPEG]{Path.GetFileName(raddicalConvert.displays[i].ImagePath)}\n");

                raddicalConvert.displays[i].PointTagList.ForEach(t =>
                {
                    sb.Append($"[TAG_VALUE]{t.Tagname}\t{t.X}\t{t.Y}\t{t.X + t.Width}\t{t.Y + t.Height}\n");
                });

                raddicalConvert.displays[i].NavLinkList.ForEach(n =>
                {
                    if (!string.IsNullOrEmpty(n.Destination))
                        sb.Append($"[AREA_LINK]{RaddicalConvert.raddicalNetworkPath}\\{n.Destination}.rvw\t{n.X}\t{n.Y}\t{n.X + n.Width}\t{n.Y + n.Height}\n");
                });


                curFileIteration++;
            };

            using (System.IO.StreamWriter file = new System.IO.StreamWriter(ApplicationStatics.savePath + "Raddical.info"))
            {
                file.WriteLine(sb.ToString());
                //sb.Clear();
            }

            System.Diagnostics.Process process = new System.Diagnostics.Process();
            System.Diagnostics.ProcessStartInfo startInfo = new System.Diagnostics.ProcessStartInfo();
            startInfo.WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden;
            startInfo.FileName = serializerPath;
            startInfo.Arguments = "\"" + ApplicationStatics.savePath + "Raddical.info\"";
            process.StartInfo = startInfo;
            try
            {
                process.Start();
                Thread.Sleep(1000);
            }
            catch (Exception e)
            {
                Logger.Out(e.Message);
                Logger.Out(e.StackTrace);
            }
        }


        //[OUTPUT_FOLDER] c:\ccu\rvw files\   // where to put RVW files
        //[DISP_NAME] 00135 // displayname
        //[DEST_FOLDER] \\server\share\CCU\   // where will this be on the network
        //[JPEG] 00135.jpg  // we could default to this, DISP_NAME.jpg
        //[TAG_VALUE] F101.PV<tab>115 <tab>233  // tagname, left, top
        //[TAG_VALUE] F102.PV<tab>135<tab>253
        //[TXT_LINK] CCU Regen<tab>\\server\share\CCU\00138.rvw<tab>320<tab>450       // display_text, link_path, left, top
        //[AREA_LINK] \\server\share\CCU\00118.rvw<tab>100<tab>120<tab>200<tab>225  // link_path, left, top, right, bottom


        public void AddDisplay(RaddicalDisplay display)
        {
            displays.Add(display);
        }

    }
}
