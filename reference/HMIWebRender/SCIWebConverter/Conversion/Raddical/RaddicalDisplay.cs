using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SCIWebConverter.Conversion.Raddical
{
    [JsonObject]
    public class RaddicalDisplay
    {
        [JsonProperty]
        private string graphicTitle, imagePath;

        [JsonProperty]
        private int width, height;

        [JsonProperty]
        private List<PointTag> pointTagList = new List<PointTag>();

        [JsonProperty]
        private List<NavigationLink> navLinkList = new List<NavigationLink>();

        public string GraphicTitle => graphicTitle;
        public string ImagePath => imagePath;
        public int Width => width;
        public int Height => height;
        public List<PointTag> PointTagList => pointTagList;
        public List<NavigationLink> NavLinkList => navLinkList;


        public RaddicalDisplay(string graphicTitle, string imagePath, int width, int height, List<PointTag> pointTagList, List<NavigationLink> navLinkList)
        {
            this.graphicTitle = graphicTitle;
            this.imagePath = imagePath;
            this.width = width * 2;
            this.height = height * 2;
            this.pointTagList = pointTagList;
            this.navLinkList = navLinkList;
        }

    }
}
