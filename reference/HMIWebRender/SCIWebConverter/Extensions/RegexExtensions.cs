using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace SCIWebConverter.Extensions
{
    class RegexExtensions
    {
        public static string ParseBetween(string stringToRegex, string captureGroup, string startText, string endText)
        {
            stringToRegex = string.Join(" ", stringToRegex);
            var matches = Regex.Matches(stringToRegex, startText + captureGroup + endText, RegexOptions.IgnoreCase | RegexOptions.Singleline);

            // Grab all scripts inside of the stringToRegex
            foreach (Match match in matches)
            {
                string value = "";

                // If a valid match is found
                if (!(value = match.Groups[1].Value).Equals(""))
                {
                    return value;
                }
            }

            return "";
        }

        public static string ParseBetween(string stringToRegex, string startText, string endText)
        {
            return ParseBetween(stringToRegex, "(.*?)", startText, endText);
        }

        public static string ParseContent(string stringToRegex)
        {
            return ParseBetween(stringToRegex, "<Content>", @"</Content>");
        }
    }
}
