using SCIWebConverter.Conversion.Interfaces;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SCIWebConverter.Conversion
{
    [JsonObject]
    public class NavigationLink : I2DLocatable
    {
        [JsonProperty]
        private string destination;

        [JsonProperty]
        private int x, y, width, height;

        [JsonIgnore]
        public string Destination { get => destination; set => destination = value; }

        [JsonIgnore]
        public int X => x;

        [JsonIgnore]
        public int Y => y;

        [JsonIgnore]
        public int Width => width;

        [JsonIgnore]
        public int Height => height;

        public NavigationLink(string destination, int x, int y, int width, int height)
        {
            Destination = destination;
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }
    }
}
