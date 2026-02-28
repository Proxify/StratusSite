using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SCIWebConverter.Security
{
    public static class Encryption
    {
        /// <summary>
        /// Encrypts the passed in string using SHA256 and returns it.
        /// </summary>
        /// <param name="rawString"></param>
        /// <returns></returns>
        public static string EncryptString(string rawString)
        {
            System.Security.Cryptography.SHA256 sha256 = new System.Security.Cryptography.SHA256Managed();
            byte[] sha256Bytes = System.Text.Encoding.Default.GetBytes(rawString);
            byte[] cryString = sha256.ComputeHash(sha256Bytes);
            string sha256Str = string.Empty;
            for (int i = 0; i < cryString.Length; i++)
            {
                sha256Str += cryString[i].ToString("X");
            }
            return sha256Str;
        }

        public static string ASCIIShift(string value, int quantity)
        {
            string newValue = "";
            
            foreach(char c in value)
            {
                int intVal = (int)c;
                newValue += (char)(intVal + quantity);
            }

            return newValue;
        }
    }

}
