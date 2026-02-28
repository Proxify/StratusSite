using SCIWebConverter.Debugging;
using PBSymLib;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace SCIWebConverter.Conversion.OSI
{
    public class PBookDisplay
    {
        private string graphicTitle;
        private List<PointTag> pointTagList = new List<PointTag>();
        private List<NavigationLink> navLinkList = new List<NavigationLink>();
        private int width, height;
        private string outputFolderPath;

        public PBookDisplay(string graphicTitle, int width, int height, List<PointTag> pointTagList, List<NavigationLink> navLinkList, string outputFolderPath)
        {
            this.graphicTitle = graphicTitle;
            this.width = width;
            this.height = height;
            this.pointTagList = pointTagList;
            this.navLinkList = navLinkList;
            this.outputFolderPath = outputFolderPath;
        }

        public void Serialize(PBObjLib.Application pbApplication)
        {
            try
            {
                PBObjLib.Display pdi = pbApplication.Displays.Add(graphicTitle);
                pdi.Width = width;
                pdi.Height = height;
                pdi.Top = 0;
                pdi.Left = 0;
                pdi.Zoom = "100";

                if (!Directory.Exists(ApplicationStatics.savePath + graphicTitle + "_tiles\\"))
                {
                    Directory.CreateDirectory(ApplicationStatics.savePath + graphicTitle + "_tiles\\");
                }

                float scale = 2.76f;
                int tileSize = 500;
                var tiler = new ImageTile(ApplicationStatics.savePath + graphicTitle + ".jpg", ((width + tileSize - 1) / tileSize), (height + tileSize - 1) / tileSize);
                tiler.GenerateTiles(ApplicationStatics.savePath + graphicTitle + "_tiles\\");

                DirectoryInfo d = new DirectoryInfo(ApplicationStatics.savePath + graphicTitle + "_tiles\\");

                foreach (var file in d.GetFiles("*.jpg"))
                {
                    string[] nameSplit = file.Name.Replace(".jpg", "").Split('_');
                    int column = Convert.ToInt32(nameSplit[0]);
                    int row = Convert.ToInt32(nameSplit[1]);

                    System.Drawing.Image img = System.Drawing.Image.FromFile(file.FullName);

                    var pbBitmap = pdi.Symbols.Add(PBObjLib.pbSYMBOLTYPE.pbSymbolBitmap) as PBSymLib.Bitmap;
                    pbBitmap.Width = (int)(img.Width * scale);
                    pbBitmap.Height = (int)(img.Height * scale);
                    pbBitmap.Left = (short)((column * (int)(img.Width * scale) - (column - 2)) - 15000);
                    pbBitmap.Top = (short)((height - (row * (int)(img.Height * scale) - (row))) + (15000 - height));
                    pbBitmap.Load(file.FullName, pbImageSizing.pbImageSizingRetainAspectRatio);
                }

                foreach (var tag in pointTagList)
                {
                    var point = pdi.Symbols.Add(PBObjLib.pbSYMBOLTYPE.pbSymbolValue) as PBSymLib.Value;
                    try
                    {
                        // Determine font size
                        int fontSize = 10;
                        Size size;
                        while ((size = TextRenderer.MeasureText("9999.99", new System.Drawing.Font("Arial", fontSize))).Height < tag.Height && size.Width < tag.Width)
                            fontSize += 3;
                        //point.Width = tag.Width;
                        //point.Height = tag.Height;
                        //point.Font.Size = (int)(pdi.Height * 0.004);
                        point.Left = -15000 + (int)(tag.X * scale) + (int)(2 * scale);
                        point.Top = 15000 - (int)(tag.Y * scale) + (int)(scale);
                        //point.Width = (int)(point.Width * scale * ApplicationStatics.imageScale);
                        //point.Height = (int)(point.Height * scale * ApplicationStatics.imageScale);
                        point.Font.Size = fontSize;
                        point.FillColor = -1;
                        point.SetTagName(tag.Tagname);
                    }
                    catch (COMException ex)
                    {
                        if (tag.Tagname.Contains("PV.CV"))
                        {
                            try
                            {
                                point.SetTagName(tag.Tagname.Replace("PV", "PV_D"));
                            }
                            catch (COMException ex2)
                            {
                                Logger.Out($"Exception occured when processing: {tag.Tagname} \n{ex2.ToString()}");
                            }
                        }
                        pdi.Symbols.Remove(point);
                        Logger.Out($"Exception occured when processing: {tag.Tagname} \n{ex.ToString()}");
                    }
                }

                foreach (var nav in navLinkList)
                {
                    if (!string.IsNullOrEmpty(nav.Destination) && !nav.Destination.Equals("11")) {
                        var button = pdi.Symbols.Add(PBObjLib.pbSYMBOLTYPE.pbSymbolButton) as PBSymLib.Button;
                        try
                        {
                            button.Width = (int)(nav.Width * scale);
                            button.Height = (int)(nav.Height * scale);
                            button.Left = -15000 + (int)(nav.X * scale) + (int)(2 * scale);
                            button.Top = 15000 - (int)(nav.Y * scale) + (int)(scale);
                            button.Font.Size = 10;
                            button.FillColor = -1;
                            button.Visible = false;

                            var buttonDef = button.GetDefinition();
                            buttonDef.Action = ApplicationStatics.savePath + "\\" + nav.Destination + ".PDI";
                            buttonDef.Options = PBSymLib.pbLinkOptions.pbLinkUseRelativePathFirst;
                            button.SetDefinition(buttonDef);
                        }
                        catch (Exception ex)
                        {
                            pdi.Symbols.Remove(button);
                            Logger.Out($"Exception occured when processing button with navigation to: {nav.Destination} \n{ex.ToString()}");
                        }
                    }
                    else
                    {
                        Logger.Out($"Skipping over a blank navigation link located at ({nav.X},{nav.Y})");
                    }
                }

                pdi.Zoom = "FitAll";

                try
                {
                    if (pdi.SaveAs(outputFolderPath, PBObjLib.pbpdFILEFORMAT.pbpdFormatDisplay))
                        pdi.Close(false);
                }
                catch (Exception e)
                {
                    Logger.Out($"Exception thrown when attempting to save {outputFolderPath}.");
                    Logger.Out(e.ToString());
                }

            }
            catch (COMException e)
            {
                Logger.Out(e.ToString());
            }
        }
    }
}
