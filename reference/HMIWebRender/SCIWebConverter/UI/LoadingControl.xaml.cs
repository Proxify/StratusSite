using ScallonUI;
using System.Windows;
using System.Windows.Controls;

namespace SCIWebConverter.UI
{
    /// <summary>
    /// Interaction logic for LoadingControl.xaml
    /// </summary>
    public partial class LoadingControl : UserControl
    {
        public LoadingControl()
        {
            InitializeComponent();
        }

        private void Image_Loaded(object sender, RoutedEventArgs e)
        {
            Animations.FadeTo(LoadingGIF, 0.75, 0.3, 0.95);
        }
    }
}
