using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SCIWebConverter.Extensions
{
    class ColorExtensions
    {
        public static Color FromHex(string hex)
        {
            if (hex.Contains("rgb"))
            {
                string[] rgbArray = hex.ToLower().Replace(" ", "").Replace("(", "").Replace(")", "").Replace("rgb", "").Split(',');
                return FromRGB(int.Parse(rgbArray[0]), int.Parse(rgbArray[1]), int.Parse(rgbArray[2]));
            }
            return System.Drawing.ColorTranslator.FromHtml(hex);
        }

        public static Color FromRGB(int r, int g, int b)
        {
            return Color.FromArgb(r, g, b);
        }

    }
}
