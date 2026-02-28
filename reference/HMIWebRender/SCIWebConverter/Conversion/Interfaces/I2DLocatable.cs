using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SCIWebConverter.Conversion.Interfaces
{
    interface I2DLocatable
    {
        int X { get; }
        int Y { get; }
        int Width { get; }
        int Height { get; }
    }
}
