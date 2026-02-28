use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ComputeMode {
    Cpu,
    Gpu,
}

impl ComputeMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Cpu => "cpu",
            Self::Gpu => "gpu",
        }
    }

    pub fn default_port(self) -> u16 {
        match self {
            Self::Cpu => 7771,
            Self::Gpu => 7772,
        }
    }
}
