using SCIWebConverter.Conversion.Interfaces;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace SCIWebConverter.Conversion
{

    [JsonObject]
    public class PointTag : I2DLocatable
    {

        [JsonProperty]
        private string tagname, fontHexColor;

        [JsonProperty]
        private int x, y, width, height;

        [JsonProperty]
        private StringAlignment horizontalAlignment;

        [JsonIgnore]
        public string Tagname => tagname;

        [JsonIgnore]
        public StringAlignment HorizontalAlignment => horizontalAlignment;

        [JsonIgnore]
        public int X => x;

        [JsonIgnore]
        public int Y => y;

        [JsonIgnore]
        public int Width => width;

        [JsonIgnore]
        public int Height => height;

        public PointTag (string tagname, string fontHexColor, int x, int y, int width, int height, StringAlignment horizontalAlignment)
        {
            this.tagname = tagname;
            this.fontHexColor = fontHexColor;
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.horizontalAlignment = horizontalAlignment;
        }

    }
}
