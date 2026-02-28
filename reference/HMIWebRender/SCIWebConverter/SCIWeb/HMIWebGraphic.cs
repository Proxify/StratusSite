using HMIWebLib.HMIWeb.Structures.HMIGraphic;
using HMIWebLib.HMIWeb.Structures.HMIGraphic.Base;
using HMIWebLib.HMIWeb.Structures.HMIGraphic.Objects;
using HMIWebLib.HMIWeb.Structures.HMIGraphic.Shape;
using SCIWebConverter.Conversion;
using SCIWebConverter.Conversion.Raddical;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;

namespace SCIWebConverter.SCIWeb
{
    public class HMIWebGraphic : HMIGraphic
    {
        private string name;

        private ConversionType conversionType = ConversionType.RENDER;
        private List<Conversion.PointTag> pointTags = new List<Conversion.PointTag>();
        private List<Conversion.NavigationLink> navigationLinks = new List<Conversion.NavigationLink>();

        public List<Conversion.PointTag> PointTags => pointTags;
        public List<Conversion.NavigationLink> NavigationLinks => navigationLinks;

        public HMIWebGraphic(string filePath, string saveDirectory, ConversionType conversionType) : base(filePath, saveDirectory)
        {
            this.name = Path.GetFileNameWithoutExtension(filePath);
            this.conversionType = conversionType;
            //Build();
        }

        public void GetAllDataAndDisplayLinks(HMIWebObject obj)
        {
            if (obj is HMIWebDataValue && obj.Width > 1 && obj.Height > 1)
            {
                HMIWebDataValue dataValue = (HMIWebDataValue)obj;
                if (!String.IsNullOrEmpty(dataValue.FullTag))
                {
                    string dataLinkAddress = dataValue.FullTag;
                    if (!string.IsNullOrEmpty(dataLinkAddress) && !dataLinkAddress.Equals("."))
                    {
                        if (dataLinkAddress.Contains(" "))
                            dataLinkAddress = dataLinkAddress.Replace(" ", "");

                        if (ApplicationStatics.tagConversionMap.ContainsKey(dataLinkAddress))
                            dataLinkAddress = ApplicationStatics.tagConversionMap[dataLinkAddress];

                        if (conversionType == ConversionType.RADDICAL)
                        {
                            dataLinkAddress = dataLinkAddress + RaddicalConvert.historianServerName;
                        }

                        pointTags.Add(new Conversion.PointTag(dataLinkAddress, dataValue.TextColor, dataValue.X, dataValue.Y, dataValue.Width, dataValue.Height, StringAlignment.Center));
                    }
                }
            }
            else if (obj is HMIWebButton)
            {
                HMIWebButton displayLink = (HMIWebButton)obj;
                string displayLinkAddress = displayLink.NavigateTo;
                if (displayLinkAddress != null)
                {
                    if (displayLinkAddress.Contains("\""))
                        displayLinkAddress = displayLinkAddress.Replace("\"", "");
                }
                navigationLinks.Add(new Conversion.NavigationLink(displayLinkAddress, displayLink.X, displayLink.Y, displayLink.Width, displayLink.Height));
            }
            else if (obj is HMIWebGroup)
            {
                ((HMIWebGroup)obj).Children.ForEach(i => GetAllDataAndDisplayLinks(i));
            }
            else if (obj is HMIWebShape)
            {
                ((HMIWebShape)obj).Children.ForEach(i => GetAllDataAndDisplayLinks(i));
            }
        }

        public void SerializeToProcessBookDisplay(PBObjLib.Application pbApplication)
        {
            Conversion.OSI.PBookDisplay graphic = new Conversion.OSI.PBookDisplay(name, Width, Height, pointTags, navigationLinks, ApplicationStatics.savePath + name + ".pdi");

            graphic.Serialize(pbApplication);
        }
    }
}